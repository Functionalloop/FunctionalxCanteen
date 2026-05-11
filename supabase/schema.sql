-- Phase 1: Database Schema & Setup
-- Execute this in the Supabase SQL Editor

-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('student', 'vendor')),
  wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
  life_gpa_score DECIMAL(3, 1) DEFAULT 4.0,
  streak_days INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menu_Templates Table
CREATE TABLE menu_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('breakfast', 'lunch', 'dinner', 'snacks')),
  allergy_tags TEXT[] DEFAULT '{}',
  price DECIMAL(10, 2) NOT NULL,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menu_Items Table
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES menu_templates(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('breakfast', 'lunch', 'dinner', 'snacks')),
  status TEXT NOT NULL CHECK (status IN ('available', 'low', 'finished')),
  allergy_tags TEXT[] DEFAULT '{}',
  rating DECIMAL(3, 2) DEFAULT 5.00,
  price DECIMAL(10, 2) NOT NULL,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders Table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id),
  items JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'ready', 'picked_up')),
  total_amount DECIMAL(10, 2) NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timetable Table
CREATE TABLE timetable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_year TEXT NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Broadcasts Table (For Staff to Broadcast Messages)
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Realtime Setup
-- Enable real-time for broadcasts and orders tables
alter publication supabase_realtime add table broadcasts;
alter publication supabase_realtime add table orders;
