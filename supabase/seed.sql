-- ════════════════════════════════════════════════════════════════════
-- HW-Track · seed.sql  (optional starter reference data)
-- Safe to run more than once.
-- ════════════════════════════════════════════════════════════════════

insert into public.categories (name, description) values
  ('Microcontroller boards', 'Arduino, ESP32, STM32 and similar dev boards'),
  ('Single-board computers', 'Raspberry Pi, Jetson, BeagleBone'),
  ('Sensors', 'Environmental, motion, optical and biomedical sensors'),
  ('Actuators & motors', 'Servos, steppers, DC motors, relays'),
  ('Power supplies', 'Bench supplies, adapters, batteries, regulators'),
  ('Test & measurement', 'Oscilloscopes, multimeters, logic analysers'),
  ('Networking', 'Routers, switches, radios, LoRa and Wi-Fi modules'),
  ('Computers & peripherals', 'Laptops, monitors, keyboards, storage'),
  ('Cables & connectors', 'Jumpers, USB, HDMI, headers'),
  ('Tools', 'Soldering stations, hand tools, 3D printers')
on conflict do nothing;

insert into public.providers (name, provider_type) values
  ('Department purchase', 'Purchase'),
  ('Research grant', 'Grant'),
  ('Alumni donation', 'Donation')
on conflict do nothing;

insert into public.locations (name, building, room) values
  ('Main store', 'Block A', 'Store room'),
  ('Embedded systems lab', 'Block B', 'Lab 2'),
  ('Project lab', 'Block B', 'Lab 4')
on conflict do nothing;
