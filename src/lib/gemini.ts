const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function getWellnessInsight(data: {
  gpa: number;
  streak: number;
  recentMeals: string[];
  points: number;
}): Promise<string> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    return getFallbackInsight(data);
  }

  try {
    const prompt = `You are a campus nutrition advisor for a college canteen app called "FunctionalCanteen".
A student has the following wellness stats:
- Life GPA (health score out of 10): ${data.gpa.toFixed(1)}
- Healthy eating streak: ${data.streak} days
- Recent meals ordered: ${data.recentMeals.join(', ') || 'No recent orders'}
- Reward points balance: ${data.points}

Give a short (2 sentences max), friendly, personalized wellness tip or observation. Be specific about their eating patterns. Don't use emojis.`;

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.7,
        },
      }),
    });

    if (!res.ok) return getFallbackInsight(data);

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() || getFallbackInsight(data);
  } catch {
    return getFallbackInsight(data);
  }
}

function getFallbackInsight(data: { gpa: number; streak: number }): string {
  if (data.gpa >= 8) {
    return `Your Life GPA of ${data.gpa.toFixed(1)} is excellent! You've maintained a ${data.streak}-day healthy streak — keep choosing balanced meals.`;
  }
  if (data.gpa >= 5) {
    return `Your Life GPA is at ${data.gpa.toFixed(1)}. Try adding more balanced meals to your routine to push it above 8 and earn weekly bonus points.`;
  }
  return `Your Life GPA is ${data.gpa.toFixed(1)} — it looks like your recent meals haven't been very balanced. Consider healthier options to boost your score.`;
}
