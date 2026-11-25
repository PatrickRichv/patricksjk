-- =====================================================================
-- Patrick's JK — Carta del local editable desde el panel
-- Se pega completo en Supabase → SQL Editor → Run. Se puede correr
-- más de una vez sin dañar nada (no duplica productos).
--
-- Crea:
--   1. admins            → correos que pueden entrar al panel y editar.
--   2. es_admin()        → dice si la sesión actual es de un admin.
--   3. productos_local   → productos y precios de carta.html.
--   4. Permisos (RLS)    → cualquiera LEE la carta; solo admins la editan.
--   5. Permisos extra para que el admin con sesión siga manejando
--      ofertas, pedidos y ruleta desde el panel (no le quita nada
--      a lo que ya funciona para los clientes).
-- =====================================================================

-- 1. Admins -------------------------------------------------------------
create table if not exists public.admins (
  email text primary key check (email = lower(email))
);
alter table public.admins enable row level security;
-- Sin políticas: nadie puede leer ni tocar esta tabla desde el sitio.

-- 2. ¿La sesión actual es de un admin? ----------------------------------
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to anon, authenticated;

-- 3. Productos de la carta del local ------------------------------------
create table if not exists public.productos_local (
  id             bigint generated always as identity primary key,
  nombre         text    not null check (length(trim(nombre)) > 0),
  categoria      text    not null check (length(trim(categoria)) > 0),
  precio         integer not null check (precio >= 0),
  sabores        text[]  not null default '{}',
  descripcion    text,
  imagen         text,
  disponible     boolean not null default true,  -- false = sale como «Agotado»
  visible        boolean not null default true,  -- false = no sale en la carta
  destacado      boolean not null default false, -- true = «Recomendado de la casa»
  orden          integer not null default 0,
  actualizado_en timestamptz not null default now()
);

create or replace function public.tocar_actualizado_en()
returns trigger language plpgsql as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

drop trigger if exists productos_local_actualizado on public.productos_local;
create trigger productos_local_actualizado
  before update on public.productos_local
  for each row execute function public.tocar_actualizado_en();

-- 4. Permisos de productos_local ----------------------------------------
alter table public.productos_local enable row level security;

drop policy if exists "carta_leer" on public.productos_local;
create policy "carta_leer" on public.productos_local
  for select to anon, authenticated
  using (visible or public.es_admin());

drop policy if exists "carta_admin_crear" on public.productos_local;
create policy "carta_admin_crear" on public.productos_local
  for insert to authenticated
  with check (public.es_admin());

drop policy if exists "carta_admin_editar" on public.productos_local;
create policy "carta_admin_editar" on public.productos_local
  for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

drop policy if exists "carta_admin_borrar" on public.productos_local;
create policy "carta_admin_borrar" on public.productos_local
  for delete to authenticated
  using (public.es_admin());

grant select on public.productos_local to anon, authenticated;
grant insert, update, delete on public.productos_local to authenticated;

-- 5. El admin con sesión sigue pudiendo manejar ofertas, pedidos y ruleta
drop policy if exists "admin_todo_ofertas" on public.ofertas;
create policy "admin_todo_ofertas" on public.ofertas
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists "admin_todo_pedidos" on public.pedidos;
create policy "admin_todo_pedidos" on public.pedidos
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists "admin_todo_dispositivos" on public.dispositivos_ruleta;
create policy "admin_todo_dispositivos" on public.dispositivos_ruleta
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- 6. Productos actuales (copiados tal cual de js/productos-estanco.js) ---
--    Solo se insertan si la tabla está vacía.
insert into public.productos_local (nombre, categoria, precio, sabores, descripcion, imagen, orden)
select * from (values
  ('José Cuervo', 'Alcohol', 130000, '{}'::text[], null, 'productos/alcohol-jose-cuervo.webp', 10),
  ('José Cuervo Media', 'Alcohol', 70000, '{}'::text[], null, 'productos/alcohol-jose-cuervo-media.webp', 20),
  ('Baileys', 'Alcohol', 120000, '{}'::text[], null, 'productos/alcohol-baileys.webp', 30),
  ('Old Parr', 'Alcohol', 260000, '{}'::text[], null, 'productos/alcohol-old-parr.webp', 40),
  ('Buchanan''s Deluxe', 'Alcohol', 280000, '{}'::text[], null, 'productos/alcohol-buchanans-deluxe.webp', 50),
  ('Buchanan''s Máster', 'Alcohol', 340000, '{}'::text[], null, 'productos/alcohol-buchanans-master.webp', 60),
  ('Aguardiente Antioqueño', 'Alcohol', 80000, '{}'::text[], null, 'productos/alcohol-aguardiente-antioqueno.webp', 70),
  ('Aguardiente Antioqueño Media', 'Alcohol', 37000, '{}'::text[], null, 'productos/alcohol-aguardiente-antioqueno-media.webp', 80),
  ('Aguardiente Caucano', 'Alcohol', 60000, '{}'::text[], null, 'productos/alcohol-aguardiente-caucano.webp', 90),
  ('Aguardiente Caucano Media', 'Alcohol', 35000, '{}'::text[], null, 'productos/alcohol-aguardiente-caucano-media.webp', 100),
  ('Aguardiente Amarillo', 'Alcohol', 85000, '{}'::text[], null, 'productos/alcohol-aguardiente-amarillo.webp', 110),
  ('Aguardiente Amarillo Media', 'Alcohol', 40000, '{}'::text[], null, 'productos/alcohol-aguardiente-amarillo-media.webp', 120),
  ('Smirnoff Tamarindo', 'Alcohol', 80000, '{}'::text[], null, 'productos/alcohol-smirnoff-tamarindo.webp', 130),
  ('Smirnoff Lulo', 'Alcohol', 80000, '{}'::text[], null, 'productos/alcohol-smirnoff-lulo.webp', 140),
  ('Smirnoff Lulo Media', 'Alcohol', 45000, '{}'::text[], null, 'productos/alcohol-smirnoff-lulo-media.webp', 150),
  ('Ron Tradicional', 'Alcohol', 85000, '{}'::text[], null, 'productos/alcohol-ron-tradicional.webp', 160),
  ('Ron Tradicional Media', 'Alcohol', 45000, '{}'::text[], null, 'productos/alcohol-ron-tradicional-media.webp', 170),
  ('Ron Esencial', 'Alcohol', 70000, '{}'::text[], null, 'productos/alcohol-ron-esencial.webp', 180),
  ('Ron Esencial Media', 'Alcohol', 40000, '{}'::text[], null, 'productos/alcohol-ron-esencial-media.webp', 190),
  ('Poker', 'Cervezas', 5000, '{}'::text[], null, 'productos/cerveza-poker.webp', 200),
  ('Corona', 'Cervezas', 8000, '{}'::text[], null, 'productos/cerveza-corona.webp', 210),
  ('Coronita', 'Cervezas', 5000, '{}'::text[], null, 'productos/cerveza-coronita.webp', 220),
  ('Águila Light', 'Cervezas', 5000, '{}'::text[], null, 'productos/cerveza-aguila-light.webp', 230),
  ('Águila Original', 'Cervezas', 5000, '{}'::text[], null, 'productos/cerveza-aguila-original.webp', 240),
  ('Club Colombia Dorada', 'Cervezas', 5000, '{}'::text[], null, 'productos/cerveza-club-colombia-dorada.webp', 250),
  ('Costeñita', 'Cervezas', 4000, '{}'::text[], null, 'productos/cerveza-costenita.webp', 260),
  ('Heineken', 'Cervezas', 5000, '{}'::text[], null, 'productos/cerveza-heineken.webp', 270),
  ('Budweiser', 'Cervezas', 5000, '{}'::text[], null, 'productos/cerveza-budweiser.webp', 280),
  ('Tecate', 'Cervezas', 4000, '{}'::text[], null, 'productos/cerveza-tecate.webp', 290),
  ('Cuates', 'Aperitivos', 6000, array['Rojo', 'Amarillo', 'Verde']::text[], null, 'productos/aperitivo-cuates-rojo.webp', 300),
  ('Smirnoff', 'Aperitivos', 12000, array['Manzana Verde', 'Original']::text[], null, 'productos/aperitivo-smirnoff-manzana-verde.webp', 310),
  ('Redd''s', 'Aperitivos', 5000, array['Rose', 'Verde']::text[], null, 'productos/aperitivo-redds-rose.webp', 320),
  ('Like', 'Aperitivos', 5000, array['Blueberry', 'Citrus', 'Mango', 'Fresh Apple']::text[], null, 'productos/aperitivo-like-blueberry.webp', 330),
  ('Bombones', 'Mecato', 1000, '{}'::text[], null, 'productos/mecato-bombones.png', 340),
  ('Maní Moto', 'Mecato', 2500, '{}'::text[], null, 'productos/mecato-mani-moto.webp', 350),
  ('Traidet', 'Mecato', 3000, '{}'::text[], null, 'productos/mecato-trident.webp', 360),
  ('Chao', 'Mecato', 2500, '{}'::text[], null, 'productos/mecato-chao.webp', 370),
  ('De Toditos', 'Mecato', 5000, array['Mix', 'BBQ', 'Limón', 'Natural', 'Pollo']::text[], null, 'productos/mecato-de-toditos.webp', 380),
  ('Margarita', 'Mecato', 5000, array['Limón', 'Natural', 'Pollo']::text[], null, 'productos/mecato-margarita-limon.webp', 390),
  ('Onduladas', 'Mecato', 5000, array['Mayonesa', 'Tomate']::text[], null, 'productos/mecato-onduladas-mayonesa.webp', 400),
  ('Cheetos', 'Mecato', 5000, '{}'::text[], null, 'productos/mecato-cheetos.webp', 410),
  ('Natuchips', 'Mecato', 5000, '{}'::text[], null, 'productos/mecato-natuchips.webp', 420),
  ('Doritos', 'Mecato', 5000, '{}'::text[], null, 'productos/mecato-doritos.webp', 430),
  ('Chochitos Medianos', 'Mecato', 10000, '{}'::text[], null, 'productos/mecato-chochitos-medianos.webp', 440),
  ('Chochitos Grandes', 'Mecato', 5000, '{}'::text[], null, 'productos/mecato-chochitos-grandes.webp', 450),
  ('Chochitos Pequeños', 'Mecato', 3000, '{}'::text[], null, 'productos/mecato-chochitos-pequenos.webp', 460),
  ('Electrolit', 'Bebidas', 12000, array['Uva', 'Fresa Kiwi', 'Jamaica', 'Maracuyá']::text[], null, 'productos/bebida-electrolit.webp', 470),
  ('Gatorade', 'Bebidas', 8000, array['Rojo', 'Azul', 'Naranja']::text[], null, 'productos/bebida-gatorade.webp', 480),
  ('Soda Grande', 'Bebidas', 7000, '{}'::text[], null, 'productos/bebida-soda-grande.webp', 490),
  ('Soda Pequeña', 'Bebidas', 5000, '{}'::text[], null, 'productos/bebida-soda-pequena.webp', 500),
  ('Agua', 'Bebidas', 3000, '{}'::text[], null, 'productos/bebida-agua.webp', 510),
  ('Bomba Patrick''s', 'Bebidas', 18000, '{}'::text[], 'Electrolit + Bon Fiest', null, 520),
  ('Bomba JK', 'Bebidas', 13000, '{}'::text[], 'Soda + Bon Fiest + Limón', null, 530),
  ('Vive 100', 'Bebidas', 5000, array['Original', 'Sandía']::text[], null, 'productos/bebida-vive100.webp', 540)
) as v(nombre, categoria, precio, sabores, descripcion, imagen, orden)
where not exists (select 1 from public.productos_local);

-- 7. Tu correo de admin --------------------------------------------------
--    Cambia el correo por el mismo con el que creaste el usuario en
--    Authentication → Users, quita los dos guiones del inicio y corre
--    solo esa línea:
-- insert into public.admins (email) values (lower('tu-correo@ejemplo.com')) on conflict do nothing;
