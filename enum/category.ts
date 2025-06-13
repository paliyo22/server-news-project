export enum Category {
  "Entretenimiento" = 'entertainment',
  "Internacional"   = 'world',
  "Empresarial"     = 'business',
  "Salud"           = 'health',
  "Deportes"        = 'sport',
  "Ciencia"         = 'science',
  "Tecnologia"      = 'technology'
}

export function isCategory(value: string): value is Category {
  return Object.values(Category).includes(value as Category);
}