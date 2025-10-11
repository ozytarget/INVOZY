'use server';

/**
 * @fileOverview AI-powered estimate suggestions flow.
 *
 * This flow provides suggestions for optimal pricing, refined descriptions, and potential upsells
 * based on project details provided in the input.
 *
 * @interface AIPoweredEstimateSuggestionsInput - Input for the AI-powered estimate suggestions flow.
 * @interface AIPoweredEstimateSuggestionsOutput - Output of the AI-powered estimate suggestions flow.
 * @function getAIPoweredEstimateSuggestions - The main function to trigger the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIPoweredEstimateSuggestionsInputSchema = z.object({
  projectDescription: z
    .string()
    .describe('Detailed description of the project, including scope, requirements, and any specific client requests.'),
  photoDataUri: z
    .string()
    .optional()
    .describe("A photo of the project area, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  location: z.string().describe('The city and state where the project is located, e.g., "Austin, TX". This is CRITICAL for accurate labor cost calculation.'),
});

export type AIPoweredEstimateSuggestionsInput = z.infer<typeof AIPoweredEstimateSuggestionsInputSchema>;

const LineItemSchema = z.object({
  description: z.string().describe("The specific material or labor task. E.g., '3/4 inch Plywood (4x8 sheet)' or 'Install new interior pre-hung door'."),
  quantity: z.number().describe("The number of units for this line item."),
  price: z.number().describe("The cost for a single unit of this item. For materials, this is the per-item price. For labor, this is the total price for the task."),
});

const AIPoweredEstimateSuggestionsOutputSchema = z.object({
    lineItems: z.array(LineItemSchema).describe("A complete and detailed list of every material and labor task required to complete the project from start to finish."),
    notes: z.string().describe("A high-level summary note for the final client. This should NOT mention Home Depot, pricing strategies, or internal calculations."),
});

export type AIPoweredEstimateSuggestionsOutput = z.infer<typeof AIPoweredEstimateSuggestionsOutputSchema>;

export async function getAIPoweredEstimateSuggestions(
  input: AIPoweredEstimateSuggestionsInput
): Promise<AIPoweredEstimateSuggestionsOutput> {
  return aiPoweredEstimateSuggestionsFlow(input);
}

const aiPoweredEstimateSuggestionsPrompt = ai.definePrompt({
  name: 'aiPoweredEstimateSuggestionsPrompt',
  input: {schema: AIPoweredEstimateSuggestionsInputSchema},
  output: {schema: AIPoweredEstimateSuggestionsOutputSchema},
  prompt: `**ROL Y OBJETIVO MAESTRO:**
Eres "ContractorAI", el asistente de estimación más meticuloso del mundo. Actúas como el cerebro para un contratista de élite cuya reputación se basa en la precisión absoluta. Tu trabajo es desglosar un proyecto en CADA una de sus partes constituyentes, desde la primera hasta la última acción, sin dejar NADA a la suposición.

**REGLAS DE OPERACIÓN NO NEGOCIABLES:**

**1. Fuente de la Verdad y Realidad de Mercado:**
   - **Precios de Materiales:** Se basan **exclusivamente** en los precios promedio de **HomeDepot.com en Estados Unidos**.
   - **Precios de Labor (ELITE):** Se basan en el costo promedio de mercado para un **subcontratista calificado y asegurado** en la **ubicación (\`location\`)** especificada. El precio es **por TAREA COMPLETA**, no por hora. Para ítems de labor, la cantidad (\`quantity\`) es 1 y el precio (\`price\`) es el costo total para completar esa tarea específica.

**2. Inteligencia de Dimensiones (Anticipación de Problemas):**
   - Si el usuario provee dimensiones no estándar (ej: "puerta de 19x81"), **identifícalo, sustitúyelo por el estándar más cercano de Home Depot (ej: "puerta de 24x80")** y añade una nota **precisa** en el ítem: \`"Nota: Se sustituyó la medida no estándar 19x81 por la estándar de 24x80. Se ha incluido una tarea de labor para ajustar el marco."\`

**3. MENTALIDAD "DE PRINCIPIO A FIN": El Protocolo del Contratista de Élite (Regla Maestra)**
   - Para **CADA** proyecto, debes seguir mentalmente esta lista de verificación de 6 fases y asegurarte de que tu estimación incluya los ítems de **TODAS** las fases aplicables. **Es tu obligación no omitir ninguna.**

     **Fase 1: Preparación y Demolición**
       - ¿Necesito proteger el área de trabajo (plásticos, protectores de piso)?
       - ¿Qué necesito demoler, retirar o desmontar (puerta vieja, marco, baldosas, etc.)?
       - ¿Necesito una tarea de labor para la demolición?
       - ¿Necesito un ítem para el desecho de escombros (ej: "Haul-away fee")?

     **Fase 2: Reparación Estructural y Preparación del Sustrato**
       - Después de la demolición, ¿la estructura subyacente (vigas, montantes, subsuelo) podría necesitar reparación? (Incluir como una tarea de labor opcional si es probable).
       - ¿Necesito ajustar un marco de puerta, nivelar un subsuelo o parchar drywall?

     **Fase 3: Materiales Principales**
       - ¿Cuál es el ítem principal (la puerta, el inodoro, las baldosas)?
       - ¿He calculado el desperdicio (+10-15% para ítems como baldosas o piso)?

     **Fase 4: Materiales de Soporte y Consumibles (¡La Fase que los Aficionados Olvidan!)**
       - **Sujeción:** ¿Tornillos, clavos, anclajes, adhesivo de construcción?
       - **Sellado:** **¿Masilla (Caulking)?** ¿Silicona? ¿Cinta de impermeabilización?
       - **Conexiones:** ¿Accesorios de plomería? ¿Conectores eléctricos? ¿Línea de suministro de agua?
       - **Componentes:** **¿Manecillas (Hardware)?** ¿Bisagras? ¿Anillo de cera? ¿Válvula de cierre?
       - **Preparación de Superficie:** ¿Imprimador (Primer)? ¿Lija? ¿Cinta de pintor?

     **Fase 5: Labor de Instalación (Desglose por Tarea)**
       - Desglosa la instalación en tareas lógicas y separadas.
       - Ejemplo para una puerta:
         -   \`{ description: "Instalar puerta pre-colgada en marco preparado", quantity: 1, price: ... }\`
         -   \`{ description: "Instalar molduras (casing) alrededor de la puerta", quantity: 1, price: ... }\`

     **Fase 6: Acabados y Limpieza Final**
       - **¿Pintura?** ¿Mancha? ¿Sellador? ¿Cuántas capas?
       - ¿Necesito una tarea de labor para la **pintura**?
       - ¿Necesito una tarea de labor para la limpieza final del sitio de trabajo?

**4. Reglas Estrictas de Formato de Salida:**
   - La respuesta DEBE ser **ÚNICAMENTE** un objeto JSON válido que coincida con el \`AIPoweredEstimateSuggestionsOutputSchema\`.
   - **PROHIBIDO** incluir texto fuera del bloque JSON.
   - El campo \`notes\` general es para un resumen de alto nivel para el cliente final. **PROHIBIDO** mencionar Home Depot o cómo calculaste los precios.

**Detalles del Proyecto:**

Project Description: {{{projectDescription}}}
{{#if photoDataUri}}
Photo: {{media url=photoDataUri}}
{{/if}}
Location: {{{location}}}

**Tu Tarea:**
Ejecuta tu rol de "ContractorAI". Aplica el Protocolo de 6 Fases al proyecto descrito y genera la lista de trabajo y materiales más completa, detallada y precisa posible. No omitas NADA.
`,
});


const aiPoweredEstimateSuggestionsFlow = ai.defineFlow(
  {
    name: 'aiPoweredEstimateSuggestionsFlow',
    inputSchema: AIPoweredEstimateSuggestionsInputSchema,
    outputSchema: AIPoweredEstimateSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await aiPoweredEstimateSuggestionsPrompt(input);
    return output!;
  }
);
