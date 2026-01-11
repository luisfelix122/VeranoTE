
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zhimcixubyylezjvpzpc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaW1jaXh1Ynl5bGV6anZwenBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3ODg3NzksImV4cCI6MjA0NzM2NDc3OX0.1p_6-Cq6M8M8V2M5V7-mXn9m7uX0-V2X8M8M8M8M8M8'; // Not real, just for structure

const normalizarRol = (rolDB) => {
    if (!rolDB) return 'cliente';
    const rolesStr = typeof rolDB === 'string' ? rolDB.toUpperCase() : '';
    if (rolesStr.includes('OWNER')) return 'dueno';
    if (rolesStr.includes('ADMIN_SEDE') || rolesStr.includes('ADMIN')) return 'admin';
    if (rolesStr.includes('VENDEDOR')) return 'vendedor';
    if (rolesStr.includes('MECANICO')) return 'mecanico';
    const rol = String(rolDB).toUpperCase();
    if (rol === 'OWNER') return 'dueno';
    if (rol === 'ADMIN_SEDE' || rol === 'ADMIN') return 'admin';
    if (rol === 'VENDEDOR') return 'vendedor';
    if (rol === 'MECANICO') return 'mecanico';
    return 'cliente';
};

console.log("Test 'ADMIN_SEDE':", normalizarRol('ADMIN_SEDE'));
console.log("Test 'OWNER':", normalizarRol('OWNER'));
console.log("Test 'VENDEDOR':", normalizarRol('VENDEDOR'));
console.log("Test 'MECANICO':", normalizarRol('MECANICO'));
console.log("Test 'ADMIN_SEDE, VENDEDOR':", normalizarRol('ADMIN_SEDE, VENDEDOR'));
