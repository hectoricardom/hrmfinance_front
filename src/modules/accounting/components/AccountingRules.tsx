/**
 * Accounting Rules Component
 * AI-powered rule recommendations and management
 */

import { Component, createSignal, createResource, Show, For } from 'solid-js';
import { Card, Button, Modal } from '../../ui';
import {
  accountingApi,
  AccountingRule,
  RuleRecommendation,
  RuleTemplate,
  BusinessAnalysis,
  GeneratedRule
} from '../services/accountingApi';

interface AccountingRulesProps {
  onRuleCreated?: () => void;
}

const AccountingRules: Component<AccountingRulesProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal<'recommendations' | 'templates' | 'analysis' | 'ai-generator'>('recommendations');
  const [selectedRule, setSelectedRule] = createSignal<RuleRecommendation | null>(null);
  const [selectedTemplate, setSelectedTemplate] = createSignal<RuleTemplate | null>(null);
  const [showRuleModal, setShowRuleModal] = createSignal(false);
  const [isCreating, setIsCreating] = createSignal(false);
  const [createResult, setCreateResult] = createSignal<{ success: boolean; message: string } | null>(null);

  // AI Generator state
  const [aiInputData, setAiInputData] = createSignal('');
  const [aiEventType, setAiEventType] = createSignal('transaction_created');
  const [isGenerating, setIsGenerating] = createSignal(false);
  const [generatedRule, setGeneratedRule] = createSignal<GeneratedRule | null>(null);
  const [generateError, setGenerateError] = createSignal<string | null>(null);

  // Demo data for recommendations
  const demoRecommendations: RuleRecommendation[] = [
    {
      rule: {
        id: 'rule-1',
        name: 'Auto-categorizar gastos de Amazon',
        description: 'Categoriza automáticamente las compras de Amazon como suministros de oficina',
        ruleType: 'auto_categorize',
        triggerType: 'transaction_created',
        conditions: [{ field: 'description', operator: 'contains', value: 'AMAZON' }],
        actions: [{ actionType: 'set_account', parameters: { accountId: '6100' } }],
        priority: 1,
        isActive: true
      },
      confidence: 0.92,
      reason: 'Se detectaron 15 transacciones de Amazon en los últimos 3 meses',
      basedOn: 'Patrón de transacciones',
      potentialImpact: { transactionsAffected: 15, timeSaved: '2 horas/mes' }
    },
    {
      rule: {
        id: 'rule-2',
        name: 'Alertar gastos grandes',
        description: 'Envía una alerta cuando un gasto supera $1,000',
        ruleType: 'alert',
        triggerType: 'transaction_created',
        conditions: [{ field: 'amount', operator: 'greater_than', value: '1000' }],
        actions: [{ actionType: 'send_alert', parameters: { message: 'Gasto mayor a $1,000' } }],
        priority: 2,
        isActive: true
      },
      confidence: 0.85,
      reason: 'Buena práctica para control de gastos',
      basedOn: 'Mejores prácticas',
      potentialImpact: { transactionsAffected: 5, timeSaved: '30 min/mes' }
    },
    {
      rule: {
        id: 'rule-3',
        name: 'Categorizar pagos de servicios',
        description: 'Categoriza pagos de electricidad, agua, internet como servicios públicos',
        ruleType: 'auto_categorize',
        triggerType: 'transaction_created',
        conditions: [{ field: 'description', operator: 'contains', value: 'UTILITY|ELECTRIC|WATER|INTERNET' }],
        actions: [{ actionType: 'set_account', parameters: { accountId: '6200' } }],
        priority: 1,
        isActive: true
      },
      confidence: 0.88,
      reason: 'Detectados pagos recurrentes de servicios',
      basedOn: 'Análisis de transacciones',
      potentialImpact: { transactionsAffected: 12, timeSaved: '1 hora/mes' }
    }
  ];

  // Demo data for templates
  const demoRuleTemplates: RuleTemplate[] = [
    {
      id: 'template-1',
      name: 'Auto-categorizar por proveedor',
      category: 'Categorización',
      description: 'Asigna automáticamente una cuenta basada en el nombre del proveedor',
      rule: {
        name: 'Categorizar por proveedor',
        description: 'Auto-categoriza transacciones por proveedor',
        ruleType: 'auto_categorize',
        triggerType: 'transaction_created',
        conditions: [],
        actions: [],
        priority: 1,
        isActive: true
      },
      requiredConfiguration: ['Nombre del proveedor', 'Cuenta destino']
    },
    {
      id: 'template-2',
      name: 'Alerta de presupuesto',
      category: 'Alertas',
      description: 'Notifica cuando una categoría supera el presupuesto mensual',
      rule: {
        name: 'Alerta presupuesto',
        description: 'Alerta cuando se supera el presupuesto',
        ruleType: 'alert',
        triggerType: 'transaction_created',
        conditions: [],
        actions: [],
        priority: 2,
        isActive: true
      },
      requiredConfiguration: ['Categoría', 'Límite mensual']
    },
    {
      id: 'template-3',
      name: 'División automática de gastos',
      category: 'División',
      description: 'Divide automáticamente un gasto entre múltiples cuentas',
      rule: {
        name: 'División de gastos',
        description: 'Divide gastos automáticamente',
        ruleType: 'auto_split',
        triggerType: 'transaction_created',
        conditions: [],
        actions: [],
        priority: 1,
        isActive: true
      },
      requiredConfiguration: ['Cuenta origen', 'Cuentas destino', 'Porcentajes']
    }
  ];

  // Demo business analysis
  const demoAnalysis: BusinessAnalysis = {
    industry: 'Comercio y Servicios',
    transactionPatterns: [
      { pattern: 'Pagos mensuales recurrentes', frequency: 12, suggestedRule: 'Auto-categorizar' },
      { pattern: 'Compras de suministros', frequency: 8, suggestedRule: 'Auto-categorizar' },
      { pattern: 'Depósitos de clientes', frequency: 25, suggestedRule: 'Auto-reconciliar' }
    ],
    commonVendors: [
      { name: 'Amazon', transactionCount: 15, suggestedCategory: 'Suministros' },
      { name: 'AT&T', transactionCount: 6, suggestedCategory: 'Telecomunicaciones' },
      { name: 'Office Depot', transactionCount: 4, suggestedCategory: 'Suministros de Oficina' }
    ],
    revenueStreams: [
      { description: 'Ventas de productos', percentage: 65 },
      { description: 'Servicios', percentage: 30 },
      { description: 'Otros ingresos', percentage: 5 }
    ],
    expenseCategories: [
      { category: 'Nómina', percentage: 35, trend: 'stable' },
      { category: 'Renta', percentage: 15, trend: 'stable' },
      { category: 'Suministros', percentage: 12, trend: 'increasing' },
      { category: 'Servicios', percentage: 8, trend: 'stable' },
      { category: 'Marketing', percentage: 10, trend: 'increasing' }
    ]
  };

  // Fetch recommendations (fallback to demo data)
  const [recommendations] = createResource(async () => {
    try {
      const result = await accountingApi.rules.getRecommended();
      return result && result.length > 0 ? result : demoRecommendations;
    } catch {
      return demoRecommendations;
    }
  });

  // Fetch templates (fallback to demo data)
  const [templates] = createResource(async () => {
    try {
      const result = await accountingApi.rules.getTemplates();
      return result && result.length > 0 ? result : demoRuleTemplates;
    } catch {
      return demoRuleTemplates;
    }
  });

  // Fetch business analysis (fallback to demo data)
  const [analysis] = createResource(async () => {
    try {
      const result = await accountingApi.rules.analyzeBusinessForRules();
      return result || demoAnalysis;
    } catch {
      return demoAnalysis;
    }
  });

  const handleApplyRule = async (recommendation: RuleRecommendation) => {
    setIsCreating(true);
    setCreateResult(null);

    try {
      const result = await accountingApi.rules.createCustom(recommendation.rule);
      if (result) {
        setCreateResult({
          success: true,
          message: `Regla "${recommendation.rule.name}" creada exitosamente`
        });
        props.onRuleCreated?.();
      } else {
        setCreateResult({
          success: false,
          message: 'Error al crear la regla'
        });
      }
    } catch (error: any) {
      setCreateResult({
        success: false,
        message: error.message || 'Error al crear la regla'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleApplyTemplate = async (template: RuleTemplate) => {
    setIsCreating(true);
    setCreateResult(null);

    try {
      const result = await accountingApi.rules.createCustom(template.rule);
      if (result) {
        setCreateResult({
          success: true,
          message: `Regla "${template.name}" creada desde plantilla`
        });
        props.onRuleCreated?.();
      } else {
        setCreateResult({
          success: false,
          message: 'Error al crear la regla'
        });
      }
    } catch (error: any) {
      setCreateResult({
        success: false,
        message: error.message || 'Error al crear la regla'
      });
    } finally {
      setIsCreating(false);
    }
  };

  // AI Rule Generation handler
  const handleGenerateRule = async () => {
    if (!aiInputData().trim()) {
      setGenerateError('Por favor ingresa una descripción para generar la regla');
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    setGeneratedRule(null);

    try {
      const result = await accountingApi.rules.generateFromAI(
        aiInputData(),
        aiEventType()
      );

      if (result) {
        setGeneratedRule(result);
      } else {
        setGenerateError('No se pudo generar la regla. Intenta con una descripción más detallada.');
      }
    } catch (error: any) {
      setGenerateError(error.message || 'Error al generar la regla con IA');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save the generated rule
  const handleSaveGeneratedRule = async () => {
    const rule = generatedRule();
    if (!rule) return;

    setIsCreating(true);
    setCreateResult(null);

    try {
      const ruleToSave: Omit<AccountingRule, 'id'> = {
        name: rule.name,
        description: rule.description,
        ruleType: rule.ruleType as AccountingRule['ruleType'],
        triggerType: rule.triggerType as AccountingRule['triggerType'],
        conditions: rule.conditions.map(c => ({
          field: c.field,
          operator: c.operator as any,
          value: c.value
        })),
        actions: rule.actions.map(a => ({
          actionType: a.actionType as any,
          parameters: a.parameters
        })),
        priority: 1,
        isActive: true
      };

      const result = await accountingApi.rules.createCustom(ruleToSave);
      if (result) {
        setCreateResult({
          success: true,
          message: `Regla "${rule.name}" creada exitosamente con IA`
        });
        setGeneratedRule(null);
        setAiInputData('');
        props.onRuleCreated?.();
      } else {
        setCreateResult({
          success: false,
          message: 'Error al guardar la regla'
        });
      }
    } catch (error: any) {
      setCreateResult({
        success: false,
        message: error.message || 'Error al guardar la regla'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const eventTypeOptions = [
    { value: 'transaction_created', label: 'Cuando se crea una transacción' },
    { value: 'document_uploaded', label: 'Cuando se sube un documento' },
    { value: 'invoice_generated', label: 'Cuando se genera una factura' },
    { value: 'inventory_movement', label: 'Cuando hay movimiento de inventario' }
  ];

  const ruleTypeLabels: Record<string, { label: string; icon: string }> = {
    auto_categorize: { label: 'Auto-categorizar', icon: '🏷️' },
    auto_split: { label: 'Auto-dividir', icon: '✂️' },
    auto_reconcile: { label: 'Auto-conciliar', icon: '🔄' },
    alert: { label: 'Alerta', icon: '🔔' },
    validation: { label: 'Validación', icon: '✓' }
  };

  const triggerTypeLabels: Record<string, string> = {
    transaction_created: 'Transacción creada',
    document_uploaded: 'Documento subido',
    invoice_generated: 'Factura generada',
    inventory_movement: 'Movimiento de inventario'
  };

  const confidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return { bg: '#d1fae5', color: '#065f46' };
    if (confidence >= 0.6) return { bg: '#fef3c7', color: '#92400e' };
    return { bg: '#fee2e2', color: '#991b1b' };
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '0.75rem 1.5rem',
    border: 'none',
    background: isActive ? 'var(--primary-color)' : 'transparent',
    color: isActive ? 'white' : 'var(--text-color)',
    cursor: 'pointer',
    'border-radius': 'var(--border-radius-sm)',
    'font-weight': isActive ? '600' : '400',
    transition: 'all 0.2s ease'
  });

  const cardStyle = {
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-md)',
    padding: '1rem',
    'margin-bottom': '0.75rem'
  };

  return (
    <div>
      {/* Header */}
      <div style={{ 'margin-bottom': '1.5rem' }}>
        <h2 style={{ 'font-size': '1.25rem', 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
          Reglas de Automatización
        </h2>
        <p style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
          Automatiza tu contabilidad con reglas inteligentes basadas en IA
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        'margin-bottom': '1.5rem',
        background: 'var(--surface-secondary)',
        padding: '0.25rem',
        'border-radius': 'var(--border-radius-md)',
        width: 'fit-content'
      }}>
        <button
          style={tabStyle(activeTab() === 'recommendations')}
          onClick={() => setActiveTab('recommendations')}
        >
          🤖 Recomendaciones
        </button>
        <button
          style={tabStyle(activeTab() === 'templates')}
          onClick={() => setActiveTab('templates')}
        >
          📋 Plantillas
        </button>
        <button
          style={tabStyle(activeTab() === 'analysis')}
          onClick={() => setActiveTab('analysis')}
        >
          📊 Análisis
        </button>
        <button
          style={tabStyle(activeTab() === 'ai-generator')}
          onClick={() => setActiveTab('ai-generator')}
        >
          ✨ Crear con IA
        </button>
      </div>

      {/* Result Message */}
      <Show when={createResult()}>
        <div style={{
          padding: '1rem',
          background: createResult()?.success ? '#d1fae5' : '#fee2e2',
          border: `1px solid ${createResult()?.success ? '#10b981' : '#ef4444'}`,
          'border-radius': 'var(--border-radius-md)',
          'margin-bottom': '1rem',
          color: createResult()?.success ? '#065f46' : '#991b1b'
        }}>
          {createResult()?.success ? '✅' : '❌'} {createResult()?.message}
        </div>
      </Show>

      {/* Recommendations Tab */}
      <Show when={activeTab() === 'recommendations'}>
        <Show when={recommendations.loading}>
          <div style={{ 'text-align': 'center', padding: '2rem' }}>
            <p>Analizando tu negocio para generar recomendaciones...</p>
          </div>
        </Show>

        <Show when={!recommendations.loading && recommendations()}>
          <Show when={recommendations()!.length === 0}>
            <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <span style={{ 'font-size': '3rem', display: 'block', 'margin-bottom': '1rem' }}>🤖</span>
              <p>No hay recomendaciones disponibles aún.</p>
              <p style={{ 'font-size': '0.875rem' }}>Agrega más transacciones para obtener sugerencias inteligentes.</p>
            </div>
          </Show>

          <For each={recommendations()}>
            {(rec) => (
              <div style={cardStyle}>
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.5rem' }}>
                      <span style={{ 'font-size': '1.25rem' }}>
                        {ruleTypeLabels[rec.rule.ruleType]?.icon || '📌'}
                      </span>
                      <h3 style={{ 'font-weight': '600' }}>{rec.rule.name}</h3>
                      <span style={{
                        padding: '0.125rem 0.5rem',
                        'border-radius': '9999px',
                        'font-size': '0.75rem',
                        ...confidenceColor(rec.confidence)
                      }}>
                        {Math.round(rec.confidence * 100)}% confianza
                      </span>
                    </div>
                    <p style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                      {rec.rule.description}
                    </p>
                    <p style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                      <strong>Razón:</strong> {rec.reason}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', 'margin-top': '0.5rem', 'font-size': '0.75rem' }}>
                      <span>📊 {rec.potentialImpact.transactionsAffected} transacciones afectadas</span>
                      <span>⏱️ Ahorro: {rec.potentialImpact.timeSaved}</span>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleApplyRule(rec)}
                    disabled={isCreating()}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            )}
          </For>
        </Show>
      </Show>

      {/* Templates Tab */}
      <Show when={activeTab() === 'templates'}>
        <Show when={templates.loading}>
          <div style={{ 'text-align': 'center', padding: '2rem' }}>
            <p>Cargando plantillas...</p>
          </div>
        </Show>

        <Show when={!templates.loading && templates()}>
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem'
          }}>
            <For each={templates()}>
              {(template) => (
                <div style={cardStyle}>
                  <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '0.75rem' }}>
                    <span style={{ 'font-size': '1.5rem' }}>
                      {ruleTypeLabels[template.rule.ruleType]?.icon || '📋'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                        {template.name}
                      </h3>
                      <p style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                        {template.category}
                      </p>
                      <p style={{ 'font-size': '0.875rem', 'margin-bottom': '0.75rem' }}>
                        {template.description}
                      </p>
                      <Show when={template.requiredConfiguration.length > 0}>
                        <p style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                          ⚙️ Requiere: {template.requiredConfiguration.join(', ')}
                        </p>
                      </Show>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleApplyTemplate(template)}
                        disabled={isCreating()}
                        style={{ 'margin-top': '0.75rem' }}
                      >
                        Usar Plantilla
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>

      {/* Analysis Tab */}
      <Show when={activeTab() === 'analysis'}>
        <Show when={analysis.loading}>
          <div style={{ 'text-align': 'center', padding: '2rem' }}>
            <p>Analizando patrones de tu negocio...</p>
          </div>
        </Show>

        <Show when={!analysis.loading && analysis()}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {/* Industry */}
            <div style={cardStyle}>
              <h3 style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>
                🏢 Industria Detectada
              </h3>
              <p style={{ 'font-size': '1.25rem', 'font-weight': '500' }}>
                {analysis()?.industry || 'General'}
              </p>
            </div>

            {/* Transaction Patterns */}
            <div style={cardStyle}>
              <h3 style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>
                📈 Patrones de Transacciones
              </h3>
              <Show when={analysis()?.transactionPatterns && analysis()!.transactionPatterns.length > 0}>
                <For each={analysis()?.transactionPatterns}>
                  {(pattern) => (
                    <div style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      padding: '0.5rem 0',
                      'border-bottom': '1px solid var(--border-color)'
                    }}>
                      <span>{pattern.pattern}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {pattern.frequency}x - {pattern.suggestedRule}
                      </span>
                    </div>
                  )}
                </For>
              </Show>
              <Show when={!analysis()?.transactionPatterns || analysis()!.transactionPatterns.length === 0}>
                <p style={{ color: 'var(--text-muted)' }}>No hay patrones detectados aún</p>
              </Show>
            </div>

            {/* Common Vendors */}
            <div style={cardStyle}>
              <h3 style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>
                🏪 Proveedores Frecuentes
              </h3>
              <Show when={analysis()?.commonVendors && analysis()!.commonVendors.length > 0}>
                <For each={analysis()?.commonVendors.slice(0, 5)}>
                  {(vendor) => (
                    <div style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      padding: '0.5rem 0',
                      'border-bottom': '1px solid var(--border-color)'
                    }}>
                      <span>{vendor.name}</span>
                      <div>
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          background: 'var(--surface-secondary)',
                          'border-radius': '9999px',
                          'font-size': '0.75rem',
                          'margin-right': '0.5rem'
                        }}>
                          {vendor.transactionCount} txns
                        </span>
                        <span style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
                          → {vendor.suggestedCategory}
                        </span>
                      </div>
                    </div>
                  )}
                </For>
              </Show>
            </div>

            {/* Expense Categories */}
            <div style={cardStyle}>
              <h3 style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>
                💰 Categorías de Gastos
              </h3>
              <Show when={analysis()?.expenseCategories && analysis()!.expenseCategories.length > 0}>
                <For each={analysis()?.expenseCategories}>
                  {(category) => (
                    <div style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      'align-items': 'center',
                      padding: '0.5rem 0',
                      'border-bottom': '1px solid var(--border-color)'
                    }}>
                      <span>{category.category}</span>
                      <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                        <span style={{ 'font-weight': '600' }}>{category.percentage}%</span>
                        <span style={{
                          'font-size': '0.75rem',
                          color: category.trend === 'increasing' ? '#059669' :
                                 category.trend === 'decreasing' ? '#dc2626' : '#6b7280'
                        }}>
                          {category.trend === 'increasing' ? '↑' :
                           category.trend === 'decreasing' ? '↓' : '→'}
                        </span>
                      </div>
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </div>
        </Show>
      </Show>

      {/* AI Generator Tab */}
      <Show when={activeTab() === 'ai-generator'}>
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Header Card */}
          <div style={{
            ...cardStyle,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none'
          }}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
              <span style={{ 'font-size': '2.5rem' }}>✨</span>
              <div>
                <h3 style={{ 'font-weight': '700', 'font-size': '1.25rem', 'margin-bottom': '0.25rem' }}>
                  Generador de Reglas con IA
                </h3>
                <p style={{ opacity: 0.9, 'font-size': '0.875rem' }}>
                  Describe lo que quieres automatizar y la IA creará la regla por ti
                </p>
              </div>
            </div>
          </div>

          {/* Data Source Selection */}
          <div style={cardStyle}>
            <h4 style={{ 'font-weight': '600', 'margin-bottom': '1rem' }}>
              1. Selecciona el tipo de evento
            </h4>
            <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <For each={eventTypeOptions}>
                {(option) => (
                  <button
                    onClick={() => setAiEventType(option.value)}
                    style={{
                      padding: '1rem',
                      border: `2px solid ${aiEventType() === option.value ? 'var(--primary-color)' : 'var(--border-color)'}`,
                      'border-radius': 'var(--border-radius-md)',
                      background: aiEventType() === option.value ? 'var(--primary-color)' : 'var(--surface-color)',
                      color: aiEventType() === option.value ? 'white' : 'inherit',
                      cursor: 'pointer',
                      'text-align': 'left',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ 'font-weight': '500' }}>{option.label}</div>
                  </button>
                )}
              </For>
            </div>
          </div>

          {/* Input Data */}
          <div style={cardStyle}>
            <h4 style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
              2. Describe la regla que necesitas
            </h4>
            <p style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '1rem' }}>
              Puedes describir en lenguaje natural o pegar datos de una factura/inventario
            </p>

            <textarea
              value={aiInputData()}
              onInput={(e) => setAiInputData(e.currentTarget.value)}
              placeholder={`Ejemplos:
• "Categorizar todas las compras de Amazon como suministros de oficina"
• "Alertar cuando un gasto supere $500"
• "Dividir gastos de servicios: 60% operación, 40% administración"
• O pega datos de una factura/inventario aquí...`}
              style={{
                width: '100%',
                'min-height': '150px',
                padding: '1rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-md)',
                'font-family': 'inherit',
                'font-size': '0.875rem',
                resize: 'vertical',
                background: 'var(--surface-color)'
              }}
            />

            {/* Quick Examples */}
            <div style={{ 'margin-top': '1rem' }}>
              <p style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                Ejemplos rápidos:
              </p>
              <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.5rem' }}>
                <button
                  onClick={() => setAiInputData('Categorizar automáticamente todas las compras de Amazon como "Suministros de Oficina" en la cuenta 6100')}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': '9999px',
                    background: 'var(--surface-secondary)',
                    cursor: 'pointer',
                    'font-size': '0.75rem'
                  }}
                >
                  Auto-categorizar Amazon
                </button>
                <button
                  onClick={() => setAiInputData('Enviar alerta cuando cualquier transacción supere $1,000 para revisión')}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': '9999px',
                    background: 'var(--surface-secondary)',
                    cursor: 'pointer',
                    'font-size': '0.75rem'
                  }}
                >
                  Alerta gastos grandes
                </button>
                <button
                  onClick={() => setAiInputData('Dividir automáticamente los gastos de renta: 70% para gastos de operación y 30% para gastos administrativos')}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': '9999px',
                    background: 'var(--surface-secondary)',
                    cursor: 'pointer',
                    'font-size': '0.75rem'
                  }}
                >
                  División de gastos
                </button>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div style={{ display: 'flex', 'justify-content': 'center' }}>
            <Button
              variant="primary"
              onClick={handleGenerateRule}
              disabled={isGenerating() || !aiInputData().trim()}
              style={{
                padding: '1rem 3rem',
                'font-size': '1rem',
                'font-weight': '600',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none'
              }}
            >
              {isGenerating() ? (
                <span style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '1rem',
                    height: '1rem',
                    border: '2px solid white',
                    'border-top-color': 'transparent',
                    'border-radius': '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Generando con IA...
                </span>
              ) : (
                '✨ Generar Regla con IA'
              )}
            </Button>
          </div>

          {/* Error Message */}
          <Show when={generateError()}>
            <div style={{
              padding: '1rem',
              background: '#fee2e2',
              border: '1px solid #ef4444',
              'border-radius': 'var(--border-radius-md)',
              color: '#991b1b'
            }}>
              ❌ {generateError()}
            </div>
          </Show>

          {/* Generated Rule Preview */}
          <Show when={generatedRule()}>
            <div style={{
              ...cardStyle,
              border: '2px solid #10b981',
              background: '#f0fdf4'
            }}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start', 'margin-bottom': '1rem' }}>
                <div>
                  <h4 style={{ 'font-weight': '700', 'font-size': '1.125rem', color: '#065f46' }}>
                    ✅ Regla Generada
                  </h4>
                  <p style={{ 'font-size': '0.875rem', color: '#059669' }}>
                    Revisa la regla y guárdala si es correcta
                  </p>
                </div>
                <Show when={generatedRule()?.confidence}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: '#d1fae5',
                    color: '#065f46',
                    'border-radius': '9999px',
                    'font-size': '0.75rem',
                    'font-weight': '600'
                  }}>
                    {Math.round((generatedRule()?.confidence || 0) * 100)}% confianza
                  </span>
                </Show>
              </div>

              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div>
                  <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Nombre</label>
                  <p style={{ 'font-weight': '600' }}>{generatedRule()?.name}</p>
                </div>
                <div>
                  <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Descripción</label>
                  <p>{generatedRule()?.description}</p>
                </div>
                <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Tipo de Regla</label>
                    <p style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                      <span>{ruleTypeLabels[generatedRule()?.ruleType || '']?.icon || '📌'}</span>
                      {ruleTypeLabels[generatedRule()?.ruleType || '']?.label || generatedRule()?.ruleType}
                    </p>
                  </div>
                  <div>
                    <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Disparador</label>
                    <p>{triggerTypeLabels[generatedRule()?.triggerType || ''] || generatedRule()?.triggerType}</p>
                  </div>
                </div>

                <Show when={generatedRule()?.conditions && generatedRule()!.conditions.length > 0}>
                  <div>
                    <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Condiciones</label>
                    <div style={{ 'margin-top': '0.25rem' }}>
                      <For each={generatedRule()?.conditions}>
                        {(condition) => (
                          <div style={{
                            padding: '0.5rem',
                            background: 'white',
                            'border-radius': 'var(--border-radius-sm)',
                            'margin-bottom': '0.25rem',
                            'font-size': '0.875rem'
                          }}>
                            <code>{condition.field}</code> {condition.operator} <code>"{condition.value}"</code>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                <Show when={generatedRule()?.actions && generatedRule()!.actions.length > 0}>
                  <div>
                    <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Acciones</label>
                    <div style={{ 'margin-top': '0.25rem' }}>
                      <For each={generatedRule()?.actions}>
                        {(action) => (
                          <div style={{
                            padding: '0.5rem',
                            background: 'white',
                            'border-radius': 'var(--border-radius-sm)',
                            'margin-bottom': '0.25rem',
                            'font-size': '0.875rem'
                          }}>
                            <strong>{action.actionType}</strong>: {JSON.stringify(action.parameters)}
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                <Show when={generatedRule()?.reasoning}>
                  <div>
                    <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Razonamiento de la IA</label>
                    <p style={{ 'font-size': '0.875rem', 'font-style': 'italic' }}>{generatedRule()?.reasoning}</p>
                  </div>
                </Show>
              </div>

              <div style={{ display: 'flex', 'justify-content': 'flex-end', gap: '0.75rem', 'margin-top': '1.5rem' }}>
                <Button
                  variant="secondary"
                  onClick={() => setGeneratedRule(null)}
                >
                  Descartar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveGeneratedRule}
                  disabled={isCreating()}
                  style={{
                    background: '#059669'
                  }}
                >
                  {isCreating() ? 'Guardando...' : '💾 Guardar Regla'}
                </Button>
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default AccountingRules;
