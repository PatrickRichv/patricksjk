-- =====================================================================
-- Patrick's JK — Tienda online (domicilios) editable desde el panel
-- Requiere haber corrido antes supabase/carta-local.sql (usa es_admin()).
-- Se pega completo en Supabase → SQL Editor → Run. Se puede correr
-- más de una vez sin dañar nada (no duplica productos).
--
-- Crea:
--   1. productos_domicilio → productos y precios de la tienda online.
--      El id es el mismo de js/productos.js para no romper los carritos
--      que la gente ya tiene guardados.
--   2. Permisos (RLS): cualquiera LEE; solo admins editan.
--   3. Bucket «productos» en Storage para subir fotos desde el panel
--      (lectura pública; solo admins suben, cambian o borran).
-- =====================================================================

-- 1. Productos de la tienda online --------------------------------------
create table if not exists public.productos_domicilio (
  id             text    primary key check (id ~ '^[a-z0-9-]+$'),
  nombre         text    not null check (length(trim(nombre)) > 0),
  categoria      text    not null check (length(trim(categoria)) > 0),
  precio         integer not null check (precio >= 0),
  sabores        text[]  not null default '{}',
  descripcion    text,
  imagen         text,
  disponible     boolean not null default true,  -- false = «Agotado», no se puede pedir
  visible        boolean not null default true,  -- false = no sale en la tienda
  destacado      boolean not null default false, -- true = sale en «Más pedidos» de Inicio
  orden          integer not null default 0,
  actualizado_en timestamptz not null default now()
);

drop trigger if exists productos_domicilio_actualizado on public.productos_domicilio;
create trigger productos_domicilio_actualizado
  before update on public.productos_domicilio
  for each row execute function public.tocar_actualizado_en();

-- 2. Permisos de productos_domicilio ------------------------------------
alter table public.productos_domicilio enable row level security;

drop policy if exists "tienda_leer" on public.productos_domicilio;
create policy "tienda_leer" on public.productos_domicilio
  for select to anon, authenticated
  using (visible or public.es_admin());

drop policy if exists "tienda_admin_crear" on public.productos_domicilio;
create policy "tienda_admin_crear" on public.productos_domicilio
  for insert to authenticated
  with check (public.es_admin());

drop policy if exists "tienda_admin_editar" on public.productos_domicilio;
create policy "tienda_admin_editar" on public.productos_domicilio
  for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

drop policy if exists "tienda_admin_borrar" on public.productos_domicilio;
create policy "tienda_admin_borrar" on public.productos_domicilio
  for delete to authenticated
  using (public.es_admin());

grant select on public.productos_domicilio to anon, authenticated;
grant insert, update, delete on public.productos_domicilio to authenticated;

-- 3. Fotos de productos (Storage) ---------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

drop policy if exists "fotos_admin_subir" on storage.objects;
create policy "fotos_admin_subir" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'productos' and public.es_admin());

drop policy if exists "fotos_admin_cambiar" on storage.objects;
create policy "fotos_admin_cambiar" on storage.objects
  for update to authenticated
  using (bucket_id = 'productos' and public.es_admin())
  with check (bucket_id = 'productos' and public.es_admin());

drop policy if exists "fotos_admin_borrar" on storage.objects;
create policy "fotos_admin_borrar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'productos' and public.es_admin());

-- 4. Productos actuales (copiados tal cual de js/productos.js) ----------
--    Solo se insertan si la tabla está vacía.
insert into public.productos_domicilio (id, nombre, categoria, precio, sabores, imagen, disponible, orden)
select * from (values
  ('cerveza-sixpack-poker', 'Six Pack Poker', 'Cervezas', 30000, '{}'::text[], 'productos/cerveza-sixpack-poker.webp', true, 10),
  ('cerveza-sixpack-aguila-light', 'Six Pack Águila Light', 'Cervezas', 30000, '{}'::text[], 'productos/cerveza-sixpack-aguila-light.webp', true, 20),
  ('cerveza-sixpack-aguila-original', 'Six Pack Águila Original', 'Cervezas', 30000, '{}'::text[], 'productos/cerveza-sixpack-aguila-original.webp', true, 30),
  ('cerveza-sixpack-budweiser', 'Six Pack Budweiser', 'Cervezas', 30000, '{}'::text[], 'productos/cerveza-sixpack-budweiser.webp', true, 40),
  ('cerveza-sixpack-heineken', 'Six Pack Heineken', 'Cervezas', 30000, '{}'::text[], 'productos/cerveza-sixpack-heineken.webp', true, 50),
  ('cerveza-poker', 'Poker', 'Cervezas', 5000, '{}'::text[], 'productos/cerveza-poker.webp', true, 60),
  ('cerveza-corona', 'Corona', 'Cervezas', 8000, '{}'::text[], 'productos/cerveza-corona.webp', true, 70),
  ('cerveza-coronita', 'Coronita', 'Cervezas', 5000, '{}'::text[], 'productos/cerveza-coronita.webp', true, 80),
  ('cerveza-aguila-light', 'Águila Light', 'Cervezas', 5000, '{}'::text[], 'productos/cerveza-aguila-light.webp', true, 90),
  ('cerveza-aguila-original', 'Águila Original', 'Cervezas', 5000, '{}'::text[], 'productos/cerveza-aguila-original.webp', true, 100),
  ('cerveza-club-colombia-dorada', 'Club Colombia Dorada', 'Cervezas', 5000, '{}'::text[], 'productos/cerveza-club-colombia-dorada.webp', true, 110),
  ('cerveza-costenita', 'Costeñita', 'Cervezas', 4000, '{}'::text[], 'productos/cerveza-costenita.webp', true, 120),
  ('cerveza-heineken', 'Heineken', 'Cervezas', 5000, '{}'::text[], 'productos/cerveza-heineken.webp', true, 130),
  ('cerveza-budweiser', 'Budweiser', 'Cervezas', 5000, '{}'::text[], 'productos/cerveza-budweiser.webp', true, 140),
  ('cerveza-tecate', 'Tecate', 'Cervezas', 4000, '{}'::text[], 'productos/cerveza-tecate.webp', true, 150),
  ('aperitivo-cuates', 'Cuates', 'Aperitivos', 6000, array['Rojo', 'Amarillo', 'Verde']::text[], 'productos/aperitivo-cuates-rojo.webp', true, 160),
  ('aperitivo-smirnoff', 'Smirnoff', 'Aperitivos', 10000, array['Manzana Verde', 'Original']::text[], 'productos/aperitivo-smirnoff-manzana-verde.webp', true, 170),
  ('aperitivo-redds', 'Redd''s', 'Aperitivos', 5000, array['Rose', 'Verde']::text[], 'productos/aperitivo-redds-rose.webp', true, 180),
  ('aperitivo-like', 'Like', 'Aperitivos', 5000, array['Blueberry', 'Citrus', 'Mango', 'Fresh Apple']::text[], 'productos/aperitivo-like-blueberry.webp', true, 190),
  ('mecato-bombones', 'Bombones', 'Mecato', 1000, '{}'::text[], 'productos/mecato-bombones.png', true, 200),
  ('mecato-mani-moto', 'Maní Moto', 'Mecato', 2500, '{}'::text[], 'productos/mecato-mani-moto.webp', true, 210),
  ('mecato-traidet', 'Traidet', 'Mecato', 3000, '{}'::text[], 'productos/mecato-trident.webp', true, 220),
  ('mecato-chao', 'Chao', 'Mecato', 2500, '{}'::text[], 'productos/mecato-chao.webp', true, 230),
  ('mecato-de-toditos', 'De Toditos', 'Mecato', 5000, array['Mix', 'BBQ', 'Limón', 'Natural', 'Pollo']::text[], 'productos/mecato-de-toditos.webp', true, 240),
  ('mecato-margarita', 'Margarita', 'Mecato', 5000, array['Limón', 'Natural', 'Pollo']::text[], 'productos/mecato-margarita-limon.webp', true, 250),
  ('mecato-onduladas', 'Onduladas', 'Mecato', 5000, array['Mayonesa', 'Tomate']::text[], 'productos/mecato-onduladas-mayonesa.webp', true, 260),
  ('mecato-cheetos', 'Cheetos', 'Mecato', 5000, '{}'::text[], 'productos/mecato-cheetos.webp', true, 270),
  ('mecato-natuchips', 'Natuchips', 'Mecato', 5000, '{}'::text[], 'productos/mecato-natuchips.webp', true, 280),
  ('mecato-doritos', 'Doritos', 'Mecato', 5000, '{}'::text[], 'productos/mecato-doritos.webp', true, 290),
  ('mecato-chochitos-medianos', 'Chochitos Medianos', 'Mecato', 5000, '{}'::text[], 'productos/mecato-chochitos-medianos.webp', true, 300),
  ('mecato-chochitos-grandes', 'Chochitos Grandes', 'Mecato', 10000, '{}'::text[], 'productos/mecato-chochitos-grandes.webp', true, 310),
  ('mecato-chochitos-pequenos', 'Chochitos Pequeños', 'Mecato', 3000, '{}'::text[], 'productos/mecato-chochitos-pequenos.webp', true, 320),
  ('bebida-electrolit', 'Electrolit', 'Bebidas', 12000, array['Uva', 'Fresa Kiwi', 'Jamaica', 'Maracuyá']::text[], 'productos/bebida-electrolit.webp', true, 330),
  ('bebida-gatorade', 'Gatorade', 'Bebidas', 6000, array['Rojo', 'Azul', 'Naranja']::text[], 'productos/bebida-gatorade.webp', true, 340),
  ('bebida-soda-grande', 'Soda Grande', 'Bebidas', 7000, '{}'::text[], 'productos/bebida-soda-grande.webp', true, 350),
  ('bebida-soda-pequena', 'Soda Pequeña', 'Bebidas', 5000, '{}'::text[], 'productos/bebida-soda-pequena.webp', true, 360),
  ('bebida-agua', 'Agua', 'Bebidas', 2500, '{}'::text[], 'productos/bebida-agua.webp', true, 370),
  ('bebida-vive100', 'Vive 100', 'Bebidas', 5000, array['Original', 'Sandía']::text[], 'productos/bebida-vive100.webp', true, 380),
  ('alcohol-jose-cuervo', 'José Cuervo', 'Alcohol', 90000, '{}'::text[], 'productos/alcohol-jose-cuervo.webp', true, 390),
  ('alcohol-jose-cuervo-media', 'José Cuervo Media', 'Alcohol', 60000, '{}'::text[], 'productos/alcohol-jose-cuervo-media.webp', true, 400),
  ('alcohol-baileys', 'Baileys', 'Alcohol', 110000, '{}'::text[], 'productos/alcohol-baileys.webp', true, 410),
  ('alcohol-old-parr', 'Old Parr', 'Alcohol', 170000, '{}'::text[], 'productos/alcohol-old-parr.webp', true, 420),
  ('alcohol-buchanans-deluxe', 'Buchanan''s Deluxe', 'Alcohol', 220000, '{}'::text[], 'productos/alcohol-buchanans-deluxe.webp', true, 430),
  ('alcohol-buchanans-master', 'Buchanan''s Máster', 'Alcohol', 270000, '{}'::text[], 'productos/alcohol-buchanans-master.webp', true, 440),
  ('alcohol-aguardiente-antioqueno', 'Aguardiente Antioqueño', 'Alcohol', 60000, '{}'::text[], 'productos/alcohol-aguardiente-antioqueno.webp', true, 450),
  ('alcohol-aguardiente-antioqueno-media', 'Aguardiente Antioqueño Media', 'Alcohol', 35000, '{}'::text[], 'productos/alcohol-aguardiente-antioqueno-media.webp', true, 460),
  ('alcohol-aguardiente-caucano', 'Aguardiente Caucano', 'Alcohol', 58000, '{}'::text[], 'productos/alcohol-aguardiente-caucano.webp', true, 470),
  ('alcohol-aguardiente-caucano-media', 'Aguardiente Caucano Media', 'Alcohol', 30000, '{}'::text[], 'productos/alcohol-aguardiente-caucano-media.webp', true, 480),
  ('alcohol-aguardiente-amarillo', 'Aguardiente Amarillo', 'Alcohol', 70000, '{}'::text[], 'productos/alcohol-aguardiente-amarillo.webp', true, 490),
  ('alcohol-aguardiente-amarillo-media', 'Aguardiente Amarillo Media', 'Alcohol', 40000, '{}'::text[], 'productos/alcohol-aguardiente-amarillo-media.webp', true, 500),
  ('alcohol-smirnoff-tamarindo', 'Smirnoff Tamarindo', 'Alcohol', 70000, '{}'::text[], 'productos/alcohol-smirnoff-tamarindo.webp', true, 510),
  ('alcohol-smirnoff-lulo', 'Smirnoff Lulo', 'Alcohol', 70000, '{}'::text[], 'productos/alcohol-smirnoff-lulo.webp', true, 520),
  ('alcohol-smirnoff-lulo-media', 'Smirnoff Lulo Media', 'Alcohol', 35000, '{}'::text[], 'productos/alcohol-smirnoff-lulo-media.webp', true, 530),
  ('alcohol-ron-tradicional', 'Ron Tradicional', 'Alcohol', 70000, '{}'::text[], 'productos/alcohol-ron-tradicional.webp', true, 540),
  ('alcohol-ron-tradicional-media', 'Ron Tradicional Media', 'Alcohol', 40000, '{}'::text[], 'productos/alcohol-ron-tradicional-media.webp', true, 550),
  ('alcohol-ron-esencial', 'Ron Esencial', 'Alcohol', 68000, '{}'::text[], 'productos/alcohol-ron-esencial.webp', true, 560),
  ('alcohol-ron-esencial-media', 'Ron Esencial Media', 'Alcohol', 38000, '{}'::text[], 'productos/alcohol-ron-esencial-media.webp', true, 570)
) as v(id, nombre, categoria, precio, sabores, imagen, disponible, orden)
where not exists (select 1 from public.productos_domicilio);
