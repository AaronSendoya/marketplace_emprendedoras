// Mientras el backend no tenga R2 conectado (paso 10b, backend/CLAUDE.md sección 1), sus
// imágenes se guardan en memoria y sus URLs empiezan con memoria://: no son alcanzables por el
// navegador y next/image fallaría en tiempo de ejecución si se le pasaran tal cual. Los
// componentes de imagen (EmprendedoraCard, ProductoCard...) llaman a esto antes de decidir si
// renderizan next/image o un marcador de posición.
export const esUrlDeImagenUsable = (url: string): boolean => url.startsWith("https://") || url.startsWith("http://");
