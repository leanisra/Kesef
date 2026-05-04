-- insertar_contratos.sql
-- Contratos de la obra Guatemala 5934
-- IMPORTANTE: correr insertar_clientes.sql antes

DO $$ DECLARE obra_uuid UUID;
BEGIN
  SELECT id INTO obra_uuid FROM obras WHERE nombre LIKE '%Guatemala%' LIMIT 1;

  INSERT INTO contratos (id, obra_id, cliente_id, estado, precio_usd_total, anticipo_usd, split_a_pct, n_cuotas, tc_contrato) VALUES
    ('e4b76f48-ec07-4e59-82b0-199e66dd406d', obra_uuid, 'd0841620-25e3-454b-8c9d-9a5ac1342b69', 'vigente', 509575, 254787.5, 50, 12, 1310),
    ('c0104249-058f-45ee-bc13-848e882ca31f', obra_uuid, '833145bb-bcbc-4577-aa9e-def46c635efe', 'vigente', 247777.69, 99111.08, 40, 12, 1245),
    ('f6aeb1a6-066d-409e-aac4-9ec17b96fb86', obra_uuid, '5bd44e47-a8bf-4f36-87ea-b5a712b49baf', 'vigente', 277602, 111040.8, 50, 6, 1475),
    ('8b13cae0-5857-4462-8e30-bd8024741505', obra_uuid, '5bd44e47-a8bf-4f36-87ea-b5a712b49baf', 'vigente', 276182.209, 110472.88, 50, 6, 1475),
    ('4e5446d2-8f19-4c65-94a0-ef217da55a23', obra_uuid, '5bd44e47-a8bf-4f36-87ea-b5a712b49baf', 'vigente', 313842, 125536.8, 50, 6, 1475),
    ('8e4f4c22-d6a3-45ae-a9da-a81f6b436baf', obra_uuid, '5bd44e47-a8bf-4f36-87ea-b5a712b49baf', 'vigente', 340053.0175, 136021.207, 50, 6, 1475),
    ('ba368ba6-ca42-42f3-bde9-58be45dca8dc', obra_uuid, '1482b7f5-b5ca-4ab9-b8db-96a6b90ba13f', 'vigente', 289846, 115938.4, 50, 6, 1550),
    ('39ef276f-170d-499e-ab2d-1c4bf891a4fb', obra_uuid, '95da60c3-0e3e-48d3-98dc-fd248ce5143e', 'vigente', 261036.96, 104414.784, 50, 2, 1080)
  ON CONFLICT (id) DO NOTHING;
END $$;