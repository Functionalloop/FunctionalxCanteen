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

export async function getVendorActionBoard(menuItems: any[]): Promise<any> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'AIzaSyC7n23G1mqOnqm6KXgJmP2GcVjPw0tXo7o') {
    return getFallbackActionBoard(menuItems);
  }

  try {
    const itemsData = menuItems.map(m => ({
      name: m.name,
      rating: m.rating,
      reviews: m.reviews,
      price: m.price
    }));

    const prompt = `You are an AI restaurant consultant for a canteen. 
Analyze the following menu items and categorize them into three action groups based on their ratings and popularity (reviews):
1. 'serveDaily': Highly rated and popular. Give a short subtext (e.g., 'high demand', 'consistent') and a trend ('up' or 'stale').
2. 'reviewRecipe': Moderate ratings or mixed reviews. Give a short subtext (e.g., 'mixed reviews', 'needs flavor boost') and a trend ('down' or 'stale').
3. 'considerRemoving': Low ratings or very low popularity. Give a short subtext (e.g., 'low orders', 'poor feedback') and a trend ('down').

Menu Data: ${JSON.stringify(itemsData)}

Return strictly in this JSON format without markdown blocks:
{
  "serveDaily": [{"item": "Name", "rating": "4.8", "subtext": "string", "trend": "up|down|stale"}],
  "reviewRecipe": [{"item": "Name", "rating": "3.8", "subtext": "string", "trend": "up|down|stale"}],
  "considerRemoving": [{"item": "Name", "rating": "2.8", "subtext": "string", "trend": "up|down|stale"}]
}
Return a maximum of 3 items per category. Ensure it is valid JSON.`;

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
        },
      }),
    });

    if (!res.ok) return getFallbackActionBoard(menuItems);

    const json = await res.json();
    let text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return getFallbackActionBoard(menuItems);

    // Clean markdown code blocks if AI included them
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (err) {
    console.error("AI Board parsing error:", err);
    return getFallbackActionBoard(menuItems);
  }
}

function getFallbackActionBoard(menuItems: any[]): any {
  if (!menuItems || menuItems.length === 0) {
    return { serveDaily: [], reviewRecipe: [], considerRemoving: [] };
  }
  const sorted = [...menuItems].sort((a, b) => b.rating - a.rating);
  const serveDaily = sorted.slice(0, 3).map(m => ({
    item: m.name, rating: m.rating.toFixed(1), subtext: 'consistent performer', trend: 'up'
  }));
  const reviewRecipe = sorted.slice(Math.max(0, Math.floor(sorted.length / 2) - 1), Math.floor(sorted.length / 2) + 2).map(m => ({
    item: m.name, rating: m.rating.toFixed(1), subtext: 'mixed feedback', trend: 'stale'
  }));
  const considerRemoving = sorted.slice(-3).map(m => ({
    item: m.name, rating: m.rating.toFixed(1), subtext: 'low popularity', trend: 'down'
  })).reverse();

  return { serveDaily, reviewRecipe, considerRemoving };
}
