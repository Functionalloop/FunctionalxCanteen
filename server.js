import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Supabase setup
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'fake-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Gemini Setup
// Use the new SDK initialization
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Phase 2: Core REST APIs

// GET /menu: Fetches the daily menu.
app.get('/api/menu', async (req, res) => {
  const { data, error } = await supabase.from('menu_items').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /order/pre-order: Validates wallet balance, deducts amount, creates order
app.post('/api/order/pre-order', async (req, res) => {
  const { student_id, items, total_amount, scheduled_time } = req.body;
  
  // Get current balance
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('wallet_balance')
    .eq('id', student_id)
    .single();
    
  if (userError || !user) return res.status(404).json({ error: 'User not found' });
  if (user.wallet_balance < total_amount) return res.status(400).json({ error: 'Insufficient balance' });

  // Deduct balance
  const { error: updateError } = await supabase
    .from('users')
    .update({ wallet_balance: user.wallet_balance - total_amount })
    .eq('id', student_id);
    
  if (updateError) return res.status(500).json({ error: 'Failed to deduct balance' });

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{ student_id, items, total_amount, scheduled_time, status: 'queued' }])
    .select()
    .single();

  if (orderError) return res.status(500).json({ error: orderError.message });
  
  res.json({ message: 'Order created', order });
});

// POST /wallet/top-up: A mock endpoint simulating a parent adding money
app.post('/api/wallet/top-up', async (req, res) => {
  const { student_id, amount } = req.body;
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('wallet_balance')
    .eq('id', student_id)
    .single();
    
  if (userError) return res.status(404).json({ error: 'User not found' });
  
  const newBalance = user.wallet_balance + amount;
  
  const { data, error } = await supabase
    .from('users')
    .update({ wallet_balance: newBalance })
    .eq('id', student_id)
    .select()
    .single();
    
  if (error) return res.status(500).json({ error: error.message });
  
  res.json({ message: 'Top-up successful', balance: data.wallet_balance });
});

// POST /feedback/rate: Accepts a rating, calculates new average
app.post('/api/feedback/rate', async (req, res) => {
  const { item_id, rating } = req.body;
  
  const { data: item, error: itemError } = await supabase
    .from('menu_items')
    .select('rating')
    .eq('id', item_id)
    .single();
    
  if (itemError) return res.status(404).json({ error: 'Item not found' });
  
  // Mock calculation: just average the old and new
  const newRating = (Number(item.rating) + Number(rating)) / 2;
  
  const { data, error } = await supabase
    .from('menu_items')
    .update({ rating: newRating.toFixed(2) })
    .eq('id', item_id)
    .select()
    .single();
    
  if (error) return res.status(500).json({ error: error.message });
  
  res.json({ message: 'Rating updated', item: data });
});

// GET /menu-templates: Fetch all templates
app.get('/api/menu-templates', async (req, res) => {
  const { data, error } = await supabase.from('menu_templates').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /menu-templates: Create a new template
app.post('/api/menu-templates', async (req, res) => {
  const { name, category, allergy_tags, price, image } = req.body;
  
  const { data, error } = await supabase
    .from('menu_templates')
    .insert([{ name, category, allergy_tags, price, image }])
    .select()
    .single();
    
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /menu/add-from-template: Add to today's menu from template
app.post('/api/menu/add-from-template', async (req, res) => {
  const { template_id } = req.body;
  
  // Fetch template
  const { data: template, error: templateError } = await supabase
    .from('menu_templates')
    .select('*')
    .eq('id', template_id)
    .single();
    
  if (templateError || !template) return res.status(404).json({ error: 'Template not found' });
  
  // Create item
  const { data, error } = await supabase
    .from('menu_items')
    .insert([{ 
      template_id: template.id,
      name: template.name,
      category: template.category,
      allergy_tags: template.allergy_tags,
      price: template.price,
      image: template.image,
      status: 'available',
      rating: 5.00
    }])
    .select()
    .single();
    
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Phase 4: AI & Timetable Logic

// Crowd Prediction Algorithm
app.get('/api/timetable/predict-crowd', async (req, res) => {
  // In a real scenario, this gets the current time and compares with timetable
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeStr = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}:00`;

  const { data: timetables, error } = await supabase.from('timetable').select('*');
  if (error) return res.status(500).json({ error: error.message });

  // Mock comparison: if any class ended within the last 15 minutes
  for (const t of timetables) {
    // Basic string comparison logic for demonstration
    // Assuming end_time is like "12:30:00"
    if (t.end_time > currentTimeStr) { // Replace with robust time math
      return res.json({ status: 'Avoid', reason: `Classes for ${t.course_year} just ended` });
    }
  }

  res.json({ status: 'Clear', reason: 'No major classes ended recently' });
});

// Life GPA Cron Job / Trigger
app.post('/api/user/:id/calculate-gpa', async (req, res) => {
  const student_id = req.params.id;
  
  // 1. Fetch last 7 days of orders
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .eq('student_id', student_id)
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (ordersError) return res.status(500).json({ error: ordersError.message });
  
  // 2. Format to prompt
  const orderHistory = orders.map(o => o.items).join(', ');
  const prompt = `Analyze this student's weekly food data: ${orderHistory}. Calculate their "Life GPA" (scale 1.0 to 4.0) based on healthiness. Also generate an empathetic response (e.g., "Are lab sessions running long?"). Respond in JSON format: {"gpa": 3.5, "message": "..."}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
    });
    
    // Parse response
    let resultText = response.text;
    // Strip markdown if needed
    if (resultText.startsWith('```json')) {
      resultText = resultText.substring(7, resultText.length - 3);
    }
    const resultJson = JSON.parse(resultText);
    
    // Update user in DB
    const { error: updateError } = await supabase
      .from('users')
      .update({ life_gpa_score: resultJson.gpa })
      .eq('id', student_id);
      
    if (updateError) return res.status(500).json({ error: updateError.message });
    
    res.json(resultJson);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI generation failed' });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend Server running on port ${PORT}`);
});
