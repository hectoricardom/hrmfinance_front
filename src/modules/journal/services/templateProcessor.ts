import { 
  JournalTemplate, 
  TemplateFormData, 
  ProcessedTemplate, 
  ExpressionContext,
  TemplateLineRule
} from '../types/journalTemplateTypes';
import { accountsStore } from '../../accounts/stores/accountsStore';

/**
 * Motor de procesamiento de plantillas dinámicas
 * Convierte una plantilla + datos del formulario en un asiento contable
 */
export class TemplateProcessor {
  
  /**
   * Procesa una plantilla con los datos del formulario
   */
  static processTemplate(template: JournalTemplate, formData: TemplateFormData): ProcessedTemplate {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Validar datos del formulario
      const formValidation = this.validateFormData(template, formData);
      errors.push(...formValidation.errors);
      warnings.push(...formValidation.warnings);

      // 2. Crear contexto para evaluación de expresiones
      const context = this.createExpressionContext(formData);

      // 3. Generar descripción y referencia
      const description = this.processExpression(
        template.settings.defaultDescription || template.name,
        context
      );
      
      const reference = this.processExpression(
        template.settings.referenceFormat || '',
        context
      );

     

      // 4. Procesar cada línea según las reglas
      const lines: any[] = [];
      
      for (const rule of template.lineRules) {
        // Evaluar condiciones de la línea
        if (!this.evaluateLineConditions(rule, context)) {
          continue; // Saltar esta línea si no cumple condiciones
        }

        try {
          // Procesar cuenta (puede ser dinámica)
          const accountId = this.processAccountExpression(rule, context);
          const account = accountsStore.getAccountById(accountId);
          
          if (!account) {
            errors.push(`Cuenta no encontrada: ${accountId} en línea: ${rule.description}`);
            continue;
          }

          // Calcular monto
          const amount = this.evaluateAmountExpression(rule.amountExpression, context);

          
          if (isNaN(amount) || amount < 0) {
            errors.push(`Monto inválido en línea: ${rule.description} (${rule.amountExpression} = ${amount})`);
            continue;
          }

          // Procesar descripción de línea
          const lineDescription = this.processExpression(rule.descriptionExpression || rule.description, context);

          // Procesar documento de línea (siempre procesar expresiones para reemplazar variables)
          const documentSource = rule.documentExpression || rule.document || '{document}';
          const lineDocument = this.processExpression(documentSource, context);

          // Crear línea del asiento
          const line = {
            accountId,
            accountName: account.name,
            description: lineDescription,
            document: lineDocument,
            debitAmount: rule.type === 'debit' ? amount : 0,
            creditAmount: rule.type === 'credit' ? amount : 0,
            type: rule.type
          };

          lines.push(line);
          
        } catch (error) {
          errors.push(`Error procesando línea "${rule.description}": ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      // 5. Validar balance del asiento
      const totalDebits = lines.reduce((sum, line) => sum + line.debitAmount, 0);
      const totalCredits = lines.reduce((sum, line) => sum + line.creditAmount, 0);
      const difference = Math.abs(totalDebits - totalCredits);
      
      if (difference > 0.01) {
        errors.push(`Asiento no balanceado: Débitos ${totalDebits.toFixed(2)}, Créditos ${totalCredits.toFixed(2)}, Diferencia ${difference.toFixed(2)}`);
      }

      if (lines.length < 2) {
        errors.push('Se requieren al menos 2 líneas para crear un asiento contable');
      }

      return {
        templateId: template.id,
        formData,
        generatedEntry: {
          description,
          reference,
          lines
        },
        validation: {
          isValid: errors.length === 0,
          errors,
          warnings
        }
      };

    } catch (error) {
      errors.push(`Error fatal procesando plantilla: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      
      return {
        templateId: template.id,
        formData,
        generatedEntry: {
          description: 'Error en plantilla',
          reference: '',
          lines: []
        },
        validation: {
          isValid: false,
          errors,
          warnings
        }
      };
    }
  }

  /**
   * Valida los datos del formulario contra la definición de la plantilla
   */
  private static validateFormData(template: JournalTemplate, formData: TemplateFormData) {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const field of template.fields) {
      const value = formData[field.name];
      
      // Validar campos requeridos
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`El campo "${field.label}" es requerido`);
        continue;
      }

      // Validar tipo de dato
      if (value !== undefined && value !== null && value !== '') {
        switch (field.type) {
          // Standard number/currency types
          case 'number':
          case 'currency':
            if (isNaN(Number(value))) {
              errors.push(`El campo "${field.label}" debe ser un número válido`);
            }
            break;

          // Specialized amount types (amount, subtotal, taxAmount)
          case 'amount':
          case 'subtotal':
          case 'taxAmount':
            if (isNaN(Number(value))) {
              errors.push(`El campo "${field.label}" debe ser un monto válido`);
            } else if (Number(value) < 0) {
              errors.push(`El campo "${field.label}" no puede ser negativo`);
            }
            break;

          // Date type
          case 'date':
            if (!(value instanceof Date) && isNaN(Date.parse(value))) {
              errors.push(`El campo "${field.label}" debe ser una fecha válida`);
            }
            break;

          // Document reference type
          case 'document':
            if (typeof value !== 'string' || value.trim().length === 0) {
              errors.push(`El campo "${field.label}" debe ser un documento válido`);
            }
            break;

          // Entity types (provider, customer) - validate they have a value
          case 'provider':
          case 'customer':
            if (!value || (typeof value === 'string' && value.trim().length === 0)) {
              if (field.required) {
                errors.push(`El campo "${field.label}" debe ser seleccionado`);
              }
            }
            break;

          // Payment and bank account types
          case 'paymentMethod':
            if (!value || (typeof value === 'string' && value.trim().length === 0)) {
              if (field.required) {
                errors.push(`El campo "${field.label}" debe ser seleccionado`);
              }
            }
            break;

          case 'bankAccount':
            if (!value || (typeof value === 'string' && value.trim().length === 0)) {
              if (field.required) {
                errors.push(`El campo "${field.label}" debe ser seleccionada`);
              }
            }
            break;

          // Text types (description, notes) - no special validation needed
          case 'description':
          case 'notes':
          case 'textarea':
          case 'text':
            // No special validation for text fields
            break;
        }

        // Validaciones personalizadas
        if (field.validation) {
          if (field.validation.min !== undefined && Number(value) < field.validation.min) {
            errors.push(`El campo "${field.label}" debe ser mayor o igual a ${field.validation.min}`);
          }
          if (field.validation.max !== undefined && Number(value) > field.validation.max) {
            errors.push(`El campo "${field.label}" debe ser menor o igual a ${field.validation.max}`);
          }
          if (field.validation.pattern && !new RegExp(field.validation.pattern).test(String(value))) {
            errors.push(field.validation.message || `El campo "${field.label}" no tiene el formato correcto`);
          }
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Crea el contexto para evaluar expresiones
   */
  private static createExpressionContext(formData: TemplateFormData): ExpressionContext {
    const today = new Date();
    
    return {
      fields: {
        ...formData,
        // Variables del sistema siempre disponibles
        today: today.toISOString().split('T')[0],
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate(),
        timestamp: Date.now()
      },
      functions: {
        sum: (...values: number[]) => values.reduce((a, b) => a + b, 0),
        multiply: (a: number, b: number) => a * b,
        divide: (a: number, b: number) => b !== 0 ? a / b : 0,
        subtract: (a: number, b: number) => a - b,
        percentage: (amount: number, percent: number) => amount * (percent / 100),
        round: (value: number, decimals = 2) => Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
      },
      constants: {
        PI: Math.PI,
        TAX_RATE: 0.18 // Configurable según país
      }
    };
  }

  /**
   * Procesa expresiones con variables (ej: "FAC-{documentNumber}-{year}")
   */
  private static processExpression(expression: string, context: ExpressionContext): string {
    let result = expression;
    
    // Reemplazar variables simples {variable}
    const variableMatches = expression.match(/\{([^}]+)\}/g);
    if (variableMatches) {
      for (const match of variableMatches) {
        const varName = match.slice(1, -1); // Remover { }
        const value = context.fields[varName];
        if (value !== undefined) {
          result = result.replace(match, String(value));
        }
      }
    }

    return result;
  }


  /**
   * Evalúa expresiones matemáticas para montos
   */
  private static evaluateAmountExpression(expression: string, context: ExpressionContext): number {
    try {
      // Reemplazar variables en la expresión
      let processedExpression = this.processExpression(expression, context);
      
      // Reemplazar funciones
      processedExpression = processedExpression.replace(/sum\((.*?)\)/g, (match, args) => {
        const values = args.split(',').map((v: string) => parseFloat(v.trim())).filter((v: number) => !isNaN(v));
        return context.functions.sum(...values).toString();
      });

      processedExpression = processedExpression.replace(/percentage\(([^,]+),([^)]+)\)/g, (match, amount, percent) => {
        return context.functions.percentage(parseFloat(amount), parseFloat(percent)).toString();
      });

      // Evaluar expresión matemática simple (solo operaciones básicas por seguridad)
      const sanitized = processedExpression.replace(/[^0-9+\-*/().\s]/g, '');
      
      // Usar Function para evaluar de forma segura (solo matemáticas básicas)
      const result = new Function('return ' + sanitized)();
      
      return typeof result === 'number' ? result : 0;
      
    } catch (error) {
      console.error('Error evaluando expresión:', expression, error);
      return 0;
    }
  }

  /**
   * Evalúa las condiciones de una línea
   */
  private static evaluateLineConditions(rule: TemplateLineRule, context: ExpressionContext): boolean {
    if (!rule.conditions || rule.conditions.length === 0) {
      return true; // Sin condiciones = siempre incluir
    }

    for (const condition of rule.conditions) {
      const fieldValue = context.fields[condition.field];
      const conditionValue = condition.value;
      
      let conditionMet = false;
      
      switch (condition.operator) {
        case '=':
          conditionMet = fieldValue == conditionValue;
          break;
        case '!=':
          conditionMet = fieldValue != conditionValue;
          break;
        case '>':
          conditionMet = Number(fieldValue) > Number(conditionValue);
          break;
        case '<':
          conditionMet = Number(fieldValue) < Number(conditionValue);
          break;
        case '>=':
          conditionMet = Number(fieldValue) >= Number(conditionValue);
          break;
        case '<=':
          conditionMet = Number(fieldValue) <= Number(conditionValue);
          break;
        case 'contains':
          conditionMet = String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
          break;
        case 'not_empty':
          conditionMet = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
          break;
      }
      
      if (!conditionMet) {
        return false; // Si cualquier condición falla, excluir la línea
      }
    }
    
    return true; // Todas las condiciones se cumplieron
  }

  /**
   * Procesa la expresión de cuenta (puede ser un ID fijo o una expresión dinámica)
   */
  private static processAccountExpression(rule: TemplateLineRule, context: ExpressionContext): string {
    if (rule.accountExpression) {
      return this.processExpression(rule.accountExpression, context);
    }
    return rule.accountId;
  }
}