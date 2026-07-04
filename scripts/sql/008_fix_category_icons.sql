-- ==========================================
-- 9. Substituição de Ícones em Texto por Emojis
-- ==========================================

-- Atualiza as categorias existentes que foram inseridas com texto 
-- para seus respectivos emojis.

UPDATE "financeOS".categories SET icon = '💼' WHERE icon = 'Briefcase';
UPDATE "financeOS".categories SET icon = '📈' WHERE icon = 'TrendingUp';
UPDATE "financeOS".categories SET icon = '🪙' WHERE icon = 'Coins';
UPDATE "financeOS".categories SET icon = '➕' WHERE icon = 'Plus';

UPDATE "financeOS".categories SET icon = '🍽️' WHERE icon = 'Utensils';
UPDATE "financeOS".categories SET icon = '🏠' WHERE icon = 'Home';
UPDATE "financeOS".categories SET icon = '🚗' WHERE icon = 'Car';
UPDATE "financeOS".categories SET icon = '▶️' WHERE icon = 'Play';
UPDATE "financeOS".categories SET icon = '❤️' WHERE icon = 'HeartPulse';
UPDATE "financeOS".categories SET icon = '🎟️' WHERE icon = 'Ticket';
UPDATE "financeOS".categories SET icon = '🎓' WHERE icon = 'GraduationCap';
UPDATE "financeOS".categories SET icon = '💳' WHERE icon = 'CreditCard';
UPDATE "financeOS".categories SET icon = '➖' WHERE icon = 'Minus';
