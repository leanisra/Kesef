-- insertar_clientes.sql
-- Clientes de la obra Guatemala 5934

INSERT INTO clientes (id, nombre, telefono, email) VALUES
  ('d0841620-25e3-454b-8c9d-9a5ac1342b69', 'Sharon Menajovsky y Matias Bekerman', NULL, NULL),
  ('833145bb-bcbc-4577-aa9e-def46c635efe', 'Ruth Fischer y Beny', NULL, NULL),
  ('5bd44e47-a8bf-4f36-87ea-b5a712b49baf', 'Edgardo Aguirre', NULL, NULL),
  ('1482b7f5-b5ca-4ab9-b8db-96a6b90ba13f', 'Gelles', NULL, NULL),
  ('95da60c3-0e3e-48d3-98dc-fd248ce5143e', 'Alberto Israel y Gabriela Hirschl', NULL, NULL)
ON CONFLICT (id) DO NOTHING;