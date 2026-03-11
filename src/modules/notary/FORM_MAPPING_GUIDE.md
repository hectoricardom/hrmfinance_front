# 📋 Form Mapping System Guide

## Overview

The Form Mapping System allows you to:
1. **🔄 Process client data automatically** - Sorts residences, employers, schools chronologically
2. **Save PDF form structures** with field positions
3. **Map PDF fields to client data fields** automatically using AI
4. **Manually edit and override** AI-generated mappings
5. **Save templates to the server** for reuse
6. **Fill forms automatically** using saved mappings

### ✨ Automatic Data Processing

**Before comparing PDF fields, the system automatically:**
- ✅ **Sorts residences chronologically** - Most recent = `[0]`, oldest = last
- ✅ **Sorts employers chronologically** - Current job = `[0]`, previous jobs follow
- ✅ **Sorts schools** - Highest/most recent degree = `[0]`
- ✅ **Groups by country** - Residences/employers organized by location
- ✅ **Formats dates** - Converts dates to proper formats for comparison
- ✅ **Identifies current items** - Marks current residence, employer, passport

**Result:** `residences[0]` is ALWAYS the current address, `employers[0]` is ALWAYS the current job!

## Components

### 1. PDFFieldMapper
Visual component that shows PDF with field overlays and allows you to see mappings.

**Features:**
- Renders PDF pages
- Shows colored overlays on form fields
- Displays which client data maps to each field
- Allows saving mappings as a template

**Usage:**
```tsx
<PDFFieldMapper
  pdfFile={pdfFile}
  customer={customer}
  onClose={() => setShowMapper(false)}
/>
```

### 2. FormMappingEditor
Component to edit saved form templates and field mappings.

**Features:**
- View all field mappings in a table
- Change client field paths for any PDF field
- Filter by mapped/unmapped/confidence level
- Save changes to server
- View statistics

**Usage:**
```tsx
<FormMappingEditor
  template={formTemplate}
  customer={customer}
  onTemplateUpdate={(updated) => setTemplate(updated)}
  onClose={() => setShowEditor(false)}
/>
```

### 3. Form Template Service
Backend service to manage form templates.

**Functions:**
```typescript
// Create a new template
const template = createFormTemplate({
  formName: 'I-485',
  formVersion: '10/15/2019',
  totalPages: 18,
  totalFields: 145,
  fieldMappings: [...]
});

// Update a template
updateFormTemplate(templateId, { formName: 'New Name' });

// Update a specific field mapping
updateClientFieldPath(templateId, 'Pt1Line1a_FamilyName', 'lastName');

// Save to server
await saveTemplateToServer(template);

// Load from server
const template = await loadTemplateFromServer(templateId);
```

## Workflow

### Step 1: Upload PDF and View Mappings

```tsx
// User uploads I-485 PDF
<I485FormComparison customer={customer} />

// Click "Vista Visual del PDF"
// Shows PDFFieldMapper with AI-generated mappings
```

### Step 2: Save as Template

Click **"💾 Guardar Como Template"** button in PDFFieldMapper.
- Enter form name (e.g., "I-485")
- Enter version (optional)
- Template is created with all AI-generated mappings

### Step 3: Edit Mappings

```tsx
// Load the saved template
const template = getFormTemplate(templateId);

// Show editor
<FormMappingEditor
  template={template}
  customer={customer}
  onTemplateUpdate={(updated) => {
    // Template is automatically updated in service
    console.log('Template updated:', updated);
  }}
/>
```

### Step 4: Use Template to Fill Forms

```typescript
import { processClientData } from './services/clientDataProcessor';
import { getFormTemplate } from './services/formTemplateService';
import { getValueByPath } from './types/formMapping';

// Get processed client data
const processedData = processClientData(customer);

// Get saved template
const template = getFormTemplate('template-id');

// Fill form fields
template.fieldMappings.forEach(mapping => {
  const value = getValueByPath(customer, mapping.clientFieldPath);

  if (mapping.manualOverride?.enabled) {
    // Use manual override value
    fillPDFField(mapping.pdfFieldName, mapping.manualOverride.value);
  } else if (value) {
    // Use mapped client data
    fillPDFField(mapping.pdfFieldName, value);
  }
});
```

## Field Mapping Structure

```typescript
interface FormFieldMapping {
  // PDF field info
  pdfFieldName: 'Pt1Line1a_FamilyName';
  pdfFieldType: 'text';
  page: 1;
  position: { x: 100, y: 200, width: 150, height: 20 };

  // Client data mapping
  clientFieldPath: 'lastName';  // Path to customer.lastName
  mappingType: 'direct';
  mappingSource: 'ai' | 'manual';
  confidence: 0.95;

  // Optional manual override
  manualOverride?: {
    enabled: true;
    value: 'DOE';
    reason: 'Form requires uppercase';
  };
}
```

## Client Field Paths

Available paths (see `CLIENT_FIELD_PATHS` in formMapping.ts):

**Personal:**
- `firstName`, `middleName`, `lastName`
- `dateOfBirth`, `placeOfBirth.city`, `placeOfBirth.country`
- `genre`, `maritalStatus`, `height`, `weight`

**Identification:**
- `alienNumber`, `ss`, `uscisOnlineAccountNumber`

**Contact:**
- `email`, `phoneNumber`, `currentLocation.state`

**Residences (array):**
- `residences[0].addressLineOne` - Most recent address
- `residences[0].city`, `residences[0].state`, `residences[0].zipcode`
- `residences[1].city` - Previous address
- `residences[2].city` - Address from 2 addresses ago

**Employers (array):**
- `employers[0].employerName` - Current employer
- `employers[0].occupation`, `employers[0].city`
- `employers[1].employerName` - Previous employer

**Education (array):**
- `schoolHistory[0].schoolName` - Most recent school
- `schoolHistory[1].schoolName` - Previous school

**Note:** Array indices work like this:
- `[0]` = Most recent / current
- `[1]` = Previous
- `[2]` = 2 items ago
- And so on...

**And many more...** See `CLIENT_FIELD_PATHS` for full list.

## 🎯 Array Index Selection - Easy 2-Step Selector

When mapping to array fields (residences, employers, schools), you can choose which specific item to use with a clear 2-step process:

### How it Works

**Step 1: Click "✏️ Cambiar" on any field**

**Step 2: Select the field** from dropdown
- Array fields are marked with 📋 icon
- Example: "Current City 📋 - Ej: Los Angeles"

**Step 3: If it's an array field, select the index**
- Visual selector appears automatically
- Shows preview of each item with actual data
- Select the correct index:
  - `[0] Más Reciente` - Current/most recent
  - `[1]` - Previous
  - `[2]` - 2 items ago
  - `[N] Más Antiguo` - Oldest

**Step 4: Click "✓ Aplicar"**

### Example: Mapping Current vs Previous Address

**Scenario:** Form has two fields:
1. "Current Address City" - should use `residences[0].city`
2. "Previous Address City" - should use `residences[1].city`

**How to map them:**

**For Field 1 (Current Address City):**
1. Click the field → Click "✏️ Cambiar"
2. **Step 1:** Select "Current City 📋" from dropdown
3. **Step 2:** Index selector appears automatically:
   ```
   2. Seleccionar Índice (📋 Residences):

   ✓ [0] Más Reciente                    [city]
      123 Main St, Los Angeles, CA, USA
      Valor: Los Angeles

     [1]                                  [city]
      456 Oak Ave, New York, NY, USA
      Valor: New York

     [2] Más Antiguo                      [city]
      789 Pine Rd, Miami, FL, USA
      Valor: Miami
   ```
4. `[0]` is already selected ✓
5. Click "✓ Aplicar"
6. **Result:** Field mapped to `residences[0].city` ✅

**For Field 2 (Previous Address City):**
1. Click the field → Click "✏️ Cambiar"
2. **Step 1:** Select "Current City 📋" (same dropdown)
3. **Step 2:** Click `[1]` in the index selector:
   ```
   2. Seleccionar Índice (📋 Residences):

     [0] Más Reciente                     [city]
      123 Main St, Los Angeles, CA, USA
      Valor: Los Angeles

   ✓ [1]                                  [city]  ← Click this!
      456 Oak Ave, New York, NY, USA
      Valor: New York
   ```
4. Click "✓ Aplicar"
5. **Result:** Field mapped to `residences[1].city` ✅

**Both fields now use the SAME property (city) but DIFFERENT indices ([0] vs [1])!**

### UI Visual Guide

**When you click "✏️ Cambiar", you see a 2-step interface:**

```
🔗 Mapeo a Campo del Cliente:

1. Seleccionar Campo:
   [v] Current City 📋 - Ej: Los Angeles    ← 📋 means it's an array!

2. Seleccionar Índice (📋 Residences):      ← Only appears for array fields!
   [Scrollable list with previews]

[✓ Aplicar] [✕ Cancelar]
```

**Key Features:**
- **📋 Icon** - Marks array fields in dropdown
- **2-Step Process** - First field, then index
- **Auto-show** - Index selector appears automatically
- **Visual Previews** - See actual data before selecting
- **Color Coding** - Green for has value, gray for empty

### Preview Information

Each item in the index selector shows:
- **Index number** and label (Más Reciente/Más Antiguo)
- **Full preview** of the item (address, employer, school)
- **Specific value** for the selected property
- **Color coding**: Green if has value, gray if empty

## Statistics

```typescript
const stats = getTemplateStats(templateId);

console.log({
  totalFields: stats.totalFields,
  mappedFields: stats.mappedFields,
  unmappedFields: stats.unmappedFields,
  manualMappings: stats.manualMappings,
  averageConfidence: stats.averageConfidence
});
```

## API Integration

### Save to Server

Implement in `formTemplateService.ts`:

```typescript
export async function saveTemplateToServer(template: FormTemplate) {
  const response = await fetch('/api/notary/form-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template)
  });

  return await response.json();
}
```

### Load from Server

```typescript
export async function loadTemplateFromServer(templateId: string) {
  const response = await fetch(`/api/notary/form-templates/${templateId}`);
  return await response.json();
}
```

### Load All Templates

```typescript
export async function loadAllTemplatesFromServer() {
  const response = await fetch('/api/notary/form-templates');
  return await response.json();
}
```

## Example: Complete Flow

```typescript
// 1. User uploads I-485 PDF
const pdfFile = new File([...], 'I485.pdf');

// 2. View and analyze
<PDFFieldMapper
  pdfFile={pdfFile}
  customer={customer}
/>

// 3. Click "Guardar Como Template"
// -> Creates template with AI mappings
// -> Saves to server

// 4. Later, edit the template
const template = await loadTemplateFromServer(templateId);

<FormMappingEditor
  template={template}
  customer={customer}
/>

// 5. User changes "Pt1Line1a_FamilyName" to map to "lastName"
// -> updateClientFieldPath() is called
// -> Template is updated
// -> Changes saved to server

// 6. Use template to fill forms for any customer
const mappings = template.fieldMappings;
mappings.forEach(m => {
  const value = getValueByPath(customer, m.clientFieldPath);
  fillPDFField(m.pdfFieldName, value);
});
```

## Benefits

✅ **Reusable Templates** - Map once, use for all customers
✅ **AI-Assisted** - Automatically suggests mappings
✅ **Review Mode** - Approve/reject AI mappings before saving
✅ **Bulk Actions** - Approve hundreds of fields in seconds
✅ **Manual Control** - Override any AI suggestion
✅ **Array Index Selection** - Choose which residence/employer/school to use
✅ **Field ID Mapping Link** - See exact connection between PDF fields and customer data
✅ **Quick Copy** - Copy field relationships and paths to clipboard
✅ **Field Linking** - Link related fields to update together
✅ **Conditional Validation** - Skip fields based on customer data
✅ **Preview Mode** - See how filled form will look before downloading
✅ **Fill & Download** - Automatically fill PDF and download completed form
✅ **Smart Previews** - See full context before selecting
✅ **Progressive Sorting** - [0] is newest, higher indices are older
✅ **Auto-Detection** - Automatically finds related fields that can be linked
✅ **Visual Indicators** - Badges for approval, linking, and status
✅ **Live Evaluation** - See if conditionals will be met in real-time
✅ **Real-Time Statistics** - Track approvals/rejections as you work
✅ **Value Preview** - See what data will be used before filling
✅ **Debug Tool** - Quickly identify incorrect mappings
✅ **Multi-Format Support** - Handles text, checkboxes, radio buttons, dropdowns
✅ **Version Control** - Track template versions
✅ **Confidence Levels** - Approve by confidence threshold
✅ **Server-Side Storage** - Templates saved for team collaboration
✅ **Flexible Paths** - Support arrays, nested objects, computed values

## 📝 Real-World Example: I-485 Form with Multiple Addresses

### Scenario

Customer has 3 residences in their history:
1. **Current**: 123 Main St, Los Angeles, CA (2022-present)
2. **Previous**: 456 Oak Ave, New York, NY (2019-2022)
3. **Older**: 789 Pine Rd, Miami, FL (2016-2019)

I-485 form asks for:
- Part 3, Line 1a: Current Physical Address
- Part 3, Line 5: Previous Physical Address (if moved in last 5 years)

### Workflow

1. **Upload I-485 PDF** and open PDFFieldMapper
2. **AI auto-maps** both fields to `residences[0].addressLineOne` (current address)
3. **Click on "Previous Address" field**
4. **See it's mapped to** `residences[0].addressLineOne` (wrong!)
5. **Click "✏️ Cambiar"** and select `residences[1].addressLineOne`
6. **OR use Array Index Selector** to click "#1" directly

### Array Index Selector Shows:

```
📋 Seleccionar Item de Residencias:

✓ #0 (Más Reciente)                    [city]
   123 Main St, Los Angeles, CA, USA
   Valor: Los Angeles

  #1                                    [city]
   456 Oak Ave, New York, NY, USA
   Valor: New York                      ← Click this!

  #2 (Más Antiguo)                     [city]
   789 Pine Rd, Miami, FL, USA
   Valor: Miami
```

7. **Click #1** → Field now maps to `residences[1].addressLineOne`
8. **Overlay updates** showing "New York" as the value
9. **Save as template** for reuse with other customers

## 🔗 Field ID Mapping Link - Visual Relationship Display

### What is it?

When you click on a PDF field, the **"Relación de Campo"** (Field Relationship) section shows you the **exact connection** between:
1. 📄 **PDF Form Field ID** - The name in the PDF (e.g., `Pt1Line1a_FamilyName`)
2. 👤 **Customer Data Field** - The path to customer data (e.g., `lastName`)
3. 💾 **Value** - The actual value that will be used

### Visual Display

**When a field is linked:**
```
🔗 Relación de Campo

┌─────────────────────────────────────┐
│ 📄 ID del Campo PDF:                │
│ Pt1Line1a_FamilyName                │
└─────────────────────────────────────┘

    ⬇️ vinculado con ⬇️

┌─────────────────────────────────────┐
│ 👤 Campo del Cliente:                │
│ lastName                            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 💾 Valor que se usará:               │
│ Smith                               │
└─────────────────────────────────────┘

[📋 Copiar Relación] [📝 Copiar Ruta]
```

**When a field is NOT linked:**
```
⚠️ Campo Sin Vincular

Este campo PDF no está vinculado a ningún dato del cliente.
No se llenará automáticamente.

[📋 Copiar Relación]
```

### Features

#### 1. **Visual Connection**
- Shows PDF field ID in monospace font
- Arrow indicating the link direction
- Customer field path in green
- Current value preview

#### 2. **Color Coding**
- **Green border** = Field is mapped and has a value
- **Yellow border** = Field is not mapped (no connection)

#### 3. **Quick Actions**

**📋 Copiar Relación** - Copies the full mapping to clipboard:
```
Pt1Line1a_FamilyName → lastName
```

**📝 Copiar Ruta** - Copies just the customer field path:
```
lastName
```
(or `residences[1].city` for array fields)

### Use Cases

#### ✅ Verify Mapping is Correct
**Before filling form:**
1. Click on "Last Name" field in PDF
2. See **"Relación de Campo"** shows:
   - PDF Field: `Pt1Line1a_FamilyName`
   - Customer Field: `lastName`
   - Value: `Smith`
3. ✅ Correct mapping!

#### ✅ Debug Incorrect Mapping
**Problem:** Field shows wrong value

**Solution:**
1. Click the field
2. See **"Relación de Campo"** shows:
   - PDF Field: `Pt1Line4_SSN`
   - Customer Field: `phoneNumber` ❌ Wrong!
   - Value: `(555) 123-4567`
3. Click **"✏️ Cambiar"** to fix mapping
4. Select correct field: `ss`
5. Now shows: `123-45-6789` ✅ Correct!

#### ✅ Document Mappings
**Need to document how fields are mapped:**
1. Click through each field
2. Click **"📋 Copiar Relación"** for each
3. Paste into documentation:
   ```
   Pt1Line1a_FamilyName → lastName
   Pt1Line1b_GivenName → firstName
   Pt1Line1c_MiddleName → middleName
   Pt1Line2_ANumber → alienNumber
   ```

#### ✅ Share with Team
**Team member asks: "What maps to the birth city field?"**
1. Find the field in PDF
2. Click it
3. See **"Relación de Campo"**:
   - Customer Field: `placeOfBirth.city`
4. Click **"📝 Copiar Ruta"**
5. Send: `placeOfBirth.city`

### Example: Complex Array Path

**Mapping previous employer city:**

```
🔗 Relación de Campo

┌─────────────────────────────────────┐
│ 📄 ID del Campo PDF:                │
│ Pt8Line3_PrevEmployerCity           │
└─────────────────────────────────────┘

    ⬇️ vinculado con ⬇️

┌─────────────────────────────────────┐
│ 👤 Campo del Cliente:                │
│ employers[1].city                   │  ← Shows array index!
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 💾 Valor que se usará:               │
│ New York                            │
└─────────────────────────────────────┘
```

This clearly shows:
- PDF field wants **previous** employer city
- Mapped to `employers[1]` (index 1 = previous job)
- Value is "New York" from previous employer

### Benefits

✅ **Clear Visualization** - See exact connection between PDF and data
✅ **Instant Understanding** - Know what value will be used
✅ **Quick Copy** - Copy mappings for documentation
✅ **Debug Tool** - Quickly identify incorrect mappings
✅ **Team Communication** - Share exact field paths
✅ **No Confusion** - Monospace font makes paths clear
✅ **Value Preview** - See if field has data before filling

### Location in UI

The **"🔗 Relación de Campo"** section appears:
- In the **right sidebar**
- Under **"Detalles del Campo"** (Field Details)
- Above **"🔗 Mapeo a Campo del Cliente"** (Field Mapping Selection)
- When you **click any PDF field**

## 🔗 Field Linking System

### Problem

When filling an address section, you often have multiple fields that should all use the **same** residence:
- Street Address → `residences[1].addressLineOne`
- City → `residences[1].city`
- State → `residences[1].state`
- ZIP Code → `residences[1].zipcode`

Manually changing each field to use index `[1]` is tedious and error-prone.

### Solution: Link Fields Together

**Link related fields** so they all share the same array index. When you change the index for one field, **all linked fields update automatically**.

### How to Link Fields

1. **Click on any PDF field** that uses an array path (e.g., `residences[0].city`)

2. **See "Campos relacionados detectados"** section showing related fields:
   ```
   💡 Campos relacionados detectados (4):
   Estos campos usan el mismo residences[0]:
   • addressLineOne
   • state
   • zipcode
   • country

   [🔗 Vincular Todos (5 campos)]
   ```

3. **Click "🔗 Vincular Todos"** to link them together

4. **Linked fields show:**
   - 🔗 Badge on PDF overlay
   - Purple glow around field
   - List of linked fields in sidebar

### Using Linked Fields

Once fields are linked:

1. **Click any linked field** → See "✓ Vinculado con N campos"
2. **Change the array index** using the selector
3. **All linked fields update automatically** to use the new index

### Example: Previous Address

**Scenario:** Form has fields for "Previous Address" (should all use `residences[1]`)

**Before Linking:**
```
Street: residences[0].addressLineOne  ❌ Wrong index
City:   residences[0].city            ❌ Wrong index
State:  residences[0].state           ❌ Wrong index
ZIP:    residences[0].zipcode         ❌ Wrong index
```

**After Linking:**
1. Click "Street" field
2. See 3 related fields detected
3. Click "🔗 Vincular Todos (4 campos)"
4. Click index selector → Select "#1 (Previous)"
5. **All 4 fields update instantly:**

```
Street: residences[1].addressLineOne  ✅ Correct
City:   residences[1].city            ✅ Correct
State:  residences[1].state           ✅ Correct
ZIP:    residences[1].zipcode         ✅ Correct
```

### Visual Indicators

**Linked fields show:**
- **🔗 Badge** in top-right corner of overlay
- **Purple glow** (`box-shadow`) around field border
- **"Vinculado" label** in legend
- **Warning message** when changing index: "⚠️ Este campo está vinculado con N campos. Cambiar el índice actualizará todos."

### Managing Links

**View linked fields:**
```
✓ Vinculado con 3 campos
Al cambiar el índice, todos estos campos se actualizarán:
• addressLineOne
• state
• zipcode

[🔓 Desvincular Este Campo]
```

**Unlink a field:**
- Click "🔓 Desvincular Este Campo" to remove one field from the group
- Other fields remain linked

### Benefits

✅ **One-click updates** - Change index once, update all related fields
✅ **No mistakes** - Can't accidentally use different indices for same address
✅ **Visual feedback** - See which fields are linked together
✅ **Auto-detection** - System automatically finds related fields
✅ **Flexible** - Link/unlink fields as needed

## ⚙️ Conditional Validation Rules

### Problem

Some PDF fields should only be filled under certain conditions:
- **Spouse Name** → Only fill if customer is married
- **Previous Address** → Only fill if customer has previous addresses
- **I-94 Number** → Only fill if customer has I-94

Without conditionals, you might fill fields incorrectly or leave required fields empty.

### Solution: Conditional Rules

Add **validation rules** to fields that determine whether they should be filled or skipped.

### Types of Conditionals

#### 1. **Skip if Empty** (Default)
Don't fill the PDF field if the customer data is empty/null/undefined.

```
Example: Middle Name field
- If customer.middleName = "" → Skip field
- If customer.middleName = "John" → Fill with "John"
```

#### 2. **Only if True**
Only fill if a boolean field is true/yes.

```
Example: Spouse Name field
- Condition: Only if isMarriage = true
- If isMarriage = false → Skip field
- If isMarriage = true → Fill with spouse name
```

#### 3. **Only if False**
Only fill if a boolean field is false/no.

```
Example: "Not Married" checkbox
- Condition: Only if isMarriage = false
- If isMarriage = true → Skip field
- If isMarriage = false → Fill checkbox
```

#### 4. **Only if Equals**
Only fill if a field equals a specific value.

```
Example: "Country of Citizenship" field in specific section
- Condition: Only if countryOfCitizenship = "Mexico"
- If countryOfCitizenship = "USA" → Skip field
- If countryOfCitizenship = "Mexico" → Fill field
```

#### 5. **Only if Not Equals**
Only fill if a field does NOT equal a specific value.

```
Example: "Foreign Passport Number"
- Condition: Only if countryOfCitizenship ≠ "USA"
- If countryOfCitizenship = "USA" → Skip field
- If countryOfCitizenship = "Mexico" → Fill field
```

### How to Add Conditional Rules

1. **Click on a PDF field** in the sidebar
2. **See "⚙️ Regla Condicional"** section
3. **Click "➕ Agregar Condición"**
4. **Configure the rule:**
   - Select condition type
   - Choose field to check
   - Enter expected value (if needed)
5. **Click "✓ Guardar"**

### UI Options

**When no condition:**
```
⚙️ Regla Condicional:
Sin condiciones - siempre llenar

[➕ Agregar Condición]
```

**When condition exists:**
```
⚙️ Regla Condicional:
⚠️ Only if isMarriage is true/yes

[✏️ Editar] [🗑️ Quitar]
```

**Conditional Editor:**
```
Tipo de Condición:
[v] Solo llenar si es verdadero/sí

Campo a verificar:
[v] ¿Está casado? (isMarriage)

[✓ Guardar] [✕ Cancelar]
```

### Real-Time Evaluation

The sidebar shows **live evaluation** of the condition:

**Condition Met:**
```
Evaluación Condicional:
✅ SE LLENARÁ - Condición cumplida
```

**Condition Not Met:**
```
Evaluación Condicional:
⏭️ SE OMITIRÁ - Condition not met: isMarriage is not true
```

### Common Use Cases

#### ✅ Marriage-Related Fields
```
Field: Spouse First Name
Condition: Only if isMarriage = true
Result: Only fills if customer is married
```

#### ✅ Immigration Status Fields
```
Field: I-94 Number
Condition: Only if hasI94 = true
Result: Only fills if customer has I-94
```

#### ✅ Address History
```
Field: Previous Address
Condition: Skip if empty
Check: residences[1].city
Result: Only fills if previous address exists
```

#### ✅ Country-Specific Fields
```
Field: US State of Birth
Condition: Only if placeOfBirth.country = "USA"
Result: Only fills if born in USA
```

### Benefits

✅ **Prevent errors** - Don't fill fields that don't apply
✅ **Save time** - Auto-skip irrelevant fields
✅ **Data validation** - Ensure form accuracy
✅ **Live feedback** - See if condition is met before filling
✅ **Flexible logic** - Check any customer field
✅ **Reusable** - Save conditions in templates

### Example: I-485 Marriage Section

**Scenario:** I-485 has spouse information fields that should only be filled if married.

**Setup:**
1. Click "Spouse First Name" field
2. Add condition: "Only if true"
3. Check field: "isMarriage"
4. Save

**Result:**
- If `customer.isMarriage = true` → ✅ Field fills with spouse name
- If `customer.isMarriage = false` → ⏭️ Field is skipped

**Repeat for all spouse fields:**
- Spouse Last Name
- Spouse Date of Birth
- Marriage Date
- Marriage Location

## 🔍 Review Mode - Approve AI Mappings

### Problem

AI generates hundreds of field mappings automatically, but:
- Some mappings might be incorrect
- You want to verify before saving
- Changing fields one by one is tedious
- Need confidence in the mappings

### Solution: Batch Review & Approval

**Review Mode** lets you quickly review and approve/reject AI-generated mappings in bulk.

### How to Use Review Mode

#### **Step 1: Enable Review Mode**
Click **"🔍 Revisar Mapeos"** button in toolbar

#### **Step 2: See Statistics**
```
📋 Revisión de Mapeos AI

Total: 145
Aprobados: 0
Rechazados: 0
Pendientes: 145
```

#### **Step 3: Use Bulk Actions**

**Quick approval options:**
- **✓ Aprobar Alta Confianza** - Approve only high-confidence mappings (90%+)
- **✓ Aprobar Media+** - Approve medium and high confidence (70%+)
- **✓ Aprobar Todos** - Approve all mappings
- **✗ Rechazar Sin Mapeo** - Reject fields with no mapping
- **🔄 Reiniciar Revisiones** - Clear all approvals/rejections

#### **Step 4: Individual Review**

**Click any field** to see approval status in sidebar:

**Not yet reviewed:**
```
📝 Revisión del Mapeo:
⚠️ Este mapeo aún no ha sido revisado

[✓ Aprobar] [✗ Rechazar]
```

**Already approved:**
```
📝 Revisión del Mapeo:
✅ APROBADO

[✗ Rechazar] [🔄 Reiniciar]
```

**Already rejected:**
```
📝 Revisión del Mapeo:
❌ RECHAZADO
Razón: Mapeo incorrecto

[✓ Aprobar] [🔄 Reiniciar]
```

### Visual Indicators

**Field overlays show approval status with badges:**

| Badge | Color | Meaning |
|-------|-------|---------|
| ✓ | Green | Approved mapping |
| ✗ | Red | Rejected mapping |
| ? | Yellow | Pending review |

### Recommended Workflow

**Option A: Trust High Confidence**
1. Click **"🔍 Revisar Mapeos"**
2. Click **"✓ Aprobar Alta Confianza"** (approves ~80% of fields)
3. Manually review remaining pending fields
4. Approve or reject individually
5. Click **"💾 Guardar Como Template"**

**Option B: Review Everything**
1. Click **"🔍 Revisar Mapeos"**
2. Click through each field
3. Press **"✓ Aprobar"** or **"✗ Rechazar"** for each
4. Watch statistics update in real-time
5. When "Pendientes: 0", save template

**Option C: Quick Approval**
1. Click **"🔍 Revisar Mapeos"**
2. Click **"✓ Aprobar Todos"**
3. Reject any obviously wrong mappings
4. Fix rejected fields manually
5. Save template

### Statistics Tracking

Real-time statistics show:
- **Total** - All fields in PDF
- **Aprobados** - Approved mappings (green)
- **Rechazados** - Rejected mappings (red)
- **Pendientes** - Not yet reviewed (yellow)

### Integration with Other Features

**Review mode works with:**
- ✅ Field linking - Approve linked fields together
- ✅ Array selection - Review index choices
- ✅ Conditionals - Review conditional rules
- ✅ Manual edits - Change mapping before approving
- ✅ Templates - Only save approved mappings

### Example: I-485 Review Workflow

**Scenario:** AI mapped 145 fields in I-485 form

**Workflow:**
1. **Enable review mode** → See "Pendientes: 145"
2. **Bulk approve** → Click "✓ Aprobar Alta Confianza"
   - Statistics update: "Aprobados: 118, Pendientes: 27"
3. **Review remaining 27** → Click through fields
   - Approve 20 correct mappings → "Aprobados: 138"
   - Reject 7 incorrect mappings → "Rechazados: 7"
4. **Fix rejected fields** → Change mappings manually
5. **Re-approve** → Approve corrected fields → "Aprobados: 145"
6. **Save template** → All mappings verified!

### Benefits

✅ **Verify AI accuracy** - Check before saving
✅ **Bulk operations** - Approve hundreds of fields in seconds
✅ **Confidence levels** - Approve by confidence threshold
✅ **Visual feedback** - See status on every field
✅ **Statistics** - Track progress in real-time
✅ **Flexible** - Approve/reject/reset anytime
✅ **Integration** - Works with all other features

## 👁️ Preview Mode - See How Filled Form Will Look

### Problem

Before actually filling a PDF, you want to:
- See how the form will look with the mapped values
- Verify all fields have correct data
- Check formatting and positioning
- Ensure nothing looks wrong

Without preview, you'd have to download the filled PDF to see issues.

### Solution: Live Preview Mode

**Preview Mode** shows the actual customer values overlaid on the PDF fields, so you can see exactly how the filled form will appear.

### How to Use Preview Mode

**Step 1: Enable Preview Mode**
Click **"👁️ Vista Previa"** button in toolbar (turns to ✓ when active)

**Step 2: See Values on PDF**
- White text boxes appear inside each mapped field
- Shows the actual value that will be filled
- Font size adapts to field height
- Text is truncated if too long for field

**Step 3: Review the Preview**
- Scroll through all pages
- Check values are correct
- Verify formatting looks good
- Ensure no text overlaps

**Step 4: Toggle Off**
Click **"✓ Vista Previa"** to return to normal mode

### Visual Display

**Normal Mode (overlays only):**
```
┌──────────────────┐
│  [Colored Box]   │  ← Shows mapping status
└──────────────────┘
```

**Preview Mode (with values):**
```
┌──────────────────┐
│  ┌────────────┐  │
│  │   Smith    │  │  ← Shows actual value
│  └────────────┘  │
└──────────────────┘
```

### What Preview Shows

**For each field with a mapped value:**
- **White text box** with the customer data
- **Centered** in the field area
- **Font size** automatically calculated based on field height
- **Truncated** with ellipsis (...) if text is too long
- **Only visible** when field has a customer value

**Fields without values:**
- No preview text shown
- Only the colored overlay remains

### Example: I-485 Form Preview

**Scenario:** Want to verify address fields before downloading

**Workflow:**
1. Map all address fields (street, city, state, ZIP)
2. Click **"👁️ Vista Previa"**
3. **See preview:**
   ```
   Street: ┌──────────────────────────┐
           │  123 Main St, Apt 4B    │
           └──────────────────────────┘

   City:   ┌──────────────┐
           │  Los Angeles │
           └──────────────┘

   State:  ┌────┐
           │ CA │
           └────┘

   ZIP:    ┌─────────┐
           │  90001  │
           └─────────┘
   ```
4. ✅ Everything looks correct!
5. Click **"📥 Descargar PDF Lleno"**

### Benefits

✅ **No Surprises** - See exactly how form will look before downloading
✅ **Catch Errors** - Spot incorrect mappings visually
✅ **Verify Formatting** - Ensure text fits in fields
✅ **Check Completeness** - Quickly see which fields have data
✅ **Save Time** - Don't download/open PDF just to check
✅ **Interactive** - Toggle on/off anytime
✅ **All Pages** - Works across entire document

## 📥 Fill & Download PDF - Generate Completed Form

### Problem

After mapping all fields, you need to:
- Actually fill the PDF with customer data
- Download the completed form
- Use it for submission

Manual PDF filling is tedious and error-prone.

### Solution: Automatic PDF Filling

**Fill & Download** button uses the mapped values to automatically fill the PDF form and download it with customer data.

### How to Fill & Download PDF

**Step 1: Ensure Mappings Are Complete**
- Review all field mappings
- Optionally use Preview Mode to verify
- Ensure critical fields are mapped

**Step 2: Click "📥 Descargar PDF Lleno"**
- Button in toolbar next to "Guardar Como Template"
- Purple background color

**Step 3: Wait for Processing**
- Button changes to "📥 Llenando..."
- PDF is loaded and fields are filled
- Status message shows progress

**Step 4: Download Automatically Starts**
- Filled PDF downloads automatically
- Filename includes customer name: `I485_filled_John_Smith.pdf`
- Original PDF remains unchanged

### What Gets Filled

**Text Fields:**
- Filled with mapped customer data as string

**Checkboxes:**
- Checked if value is: `true`, `yes`, `sí`, `1`, `x`
- Unchecked otherwise

**Radio Buttons:**
- Selected if value matches option name
- Skipped if value doesn't match any option

**Dropdown Fields:**
- Selected if value matches option
- Skipped if value doesn't match

### Conditional Handling

**Fields with conditions are evaluated:**
- ✅ If condition is met → Field is filled
- ⏭️ If condition is NOT met → Field is skipped

**Example:**
```
Field: Spouse Name
Condition: Only if isMarriage = true
Customer: isMarriage = false

Result: Field is NOT filled (skipped)
```

### Success Message

After completion, you'll see a message:
```
✅ PDF llenado! 118 campos llenados, 27 omitidos
```

Shows:
- **Llenados** - Successfully filled fields
- **Omitidos** - Skipped fields (no mapping, no value, or condition not met)

### Downloaded File Name Format

```
{originalName}_filled_{firstName}_{lastName}.pdf
```

**Examples:**
- `I485_filled_John_Smith.pdf`
- `I539_filled_Maria_Garcia.pdf`
- `I765_filled_Wei_Chen.pdf`

### Example Workflow

**Complete I-485 Form:**

1. **Upload I-485 PDF** → AI generates mappings
2. **Review mappings** → Fix any incorrect ones
3. **Link related fields** → Group address/employer fields
4. **Add conditionals** → Spouse fields only if married
5. **Enable Preview Mode** → Verify visually
6. **Click "📥 Descargar PDF Lleno"** → Download filled form
7. **Open downloaded PDF** → Ready for submission! ✅

### Error Handling

**If a field fails to fill:**
- Error is logged to console
- Field is counted as "omitido" (skipped)
- Other fields continue to fill
- Final PDF is still downloaded

**Common reasons for skip:**
- No mapping assigned
- No customer value available
- Conditional rule not met
- Field type mismatch (rare)

### Benefits

✅ **Automatic** - No manual copying of data
✅ **Fast** - Fills entire form in seconds
✅ **Accurate** - Uses exact mapped values
✅ **Conditional** - Respects validation rules
✅ **Safe** - Original PDF unchanged
✅ **Named** - Downloads with customer name
✅ **Complete** - Handles text, checkboxes, radio, dropdown
✅ **Robust** - Continues even if some fields fail

### Integration with Other Features

**Works seamlessly with:**
- ✅ **Array Indices** - Uses correct residence/employer/school
- ✅ **Field Linking** - Fills all linked fields consistently
- ✅ **Conditionals** - Skips fields that don't meet conditions
- ✅ **Review Mode** - Can fill after reviewing mappings
- ✅ **Processed Data** - Uses chronologically sorted arrays
- ✅ **Templates** - Can fill using saved template mappings

## Next Steps

1. Implement server API endpoints for saving/loading templates
2. Add transformation rules (date formatting, uppercase, etc.)
3. Add conditional mappings (if/else logic)
4. Add computed fields (concatenate first + last name)
5. Add validation rules (required fields, format checks)
6. Add template versioning and history
7. Add team sharing and permissions
