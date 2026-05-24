import { NextResponse } from "next/server";
import OpenAI from "openai";

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Error desconocido";
};

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MODEL_TIMEOUT_MS = 25_000;

export async function POST(req: Request) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "Falta configurar OPENROUTER_API_KEY." },
        { status: 500 }
      );
    }

    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Falta el texto del gasto." },
        { status: 400 }
      );
    }

    const systemPrompt = `Eres un asistente financiero avanzado diseñado para extraer información de gastos a partir de lenguaje natural.
Tu única respuesta debe ser un objeto JSON estricto con los datos extraídos.

Reglas:
- Extrae el concepto principal y colócalo en 'title'.
- Extrae el monto numérico y colócalo en 'amount' (sólo números, ej: 15.50). Si no se especifica, usa 0.
- Categoriza el gasto lógicamente en una de las siguientes categorías predeterminadas: "Comida", "Vivienda", "Servicios", "Transporte", "Entretenimiento", "Compras", "Salud", "Mamá", "Educación", "Mascotas", "Viajes", "Regalos", "Suscripciones", "Hogar", "Belleza", "Préstamos", "Otros".
- Retorna el JSON en este formato exacto:
{
  "title": "Descripción del gasto",
  "amount": 15.5,
  "category": "Comida"
}`;

    const model = process.env.OPENROUTER_MODEL?.trim() || "meta-llama/llama-3.3-70b-instruct:free";

    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }, {
      timeout: MODEL_TIMEOUT_MS,
    });

    const resultText = response.choices?.[0]?.message?.content || "{}";
    
    let parsedResult;
    try {
      parsedResult = JSON.parse(resultText);
    } catch (e) {
      console.error("No se pudo parsear el resultado JSON de la IA:", resultText);
      return NextResponse.json(
        { error: "La IA no devolvió un formato JSON válido." },
        { status: 500 }
      );
    }

    // Map alternative/legacy category names to our official categories
    const categoryMapping: Record<string, string> = {
      "Alimentación": "Comida",
      "Ocio": "Entretenimiento",
      "Ropa": "Compras",
      "Tecnología": "Compras",
      "Mom": "Mamá",
      "Mama": "Mamá",
      "Family": "Otros",
      "Familia": "Otros",
      "Income": "Ingresos",
      "Ingreso": "Ingresos",
      "Beauty": "Belleza",
      "Cosméticos": "Belleza",
      "Cosmeticos": "Belleza",
      "Peluquería": "Belleza",
      "Peluqueria": "Belleza",
      "Préstamos Rápidos": "Préstamos",
      "Prestamos Rapidos": "Préstamos",
      "Préstamo": "Préstamos",
      "Prestamo": "Préstamos",
      "Prestamos": "Préstamos",
      "Loan": "Préstamos",
      "Lending": "Préstamos",
      "Amigo": "Préstamos",
      "Amigos": "Préstamos"
    };

    let matchedCategory = parsedResult.category || "Otros";
    if (categoryMapping[matchedCategory]) {
      matchedCategory = categoryMapping[matchedCategory];
    }

    // Asegurar estructura
    const finalData = {
      title: parsedResult.title || text.substring(0, 50),
      amount: Number(parsedResult.amount) || 0,
      category: matchedCategory
    };

    return NextResponse.json(finalData);
  } catch (error: unknown) {
    console.error("Parse Expense API Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Error al procesar el gasto" },
      { status: 500 }
    );
  }
}
