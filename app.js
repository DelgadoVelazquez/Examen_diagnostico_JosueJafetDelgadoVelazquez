const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Ruta del archivo de productos
const ARCHIVO_PRODUCTOS = path.join(__dirname, 'productos.json');

// ========== FUNCIONES AUXILIARES ==========

// Cargar productos desde el archivo
function cargarProductos() {
  try {
    if (fs.existsSync(ARCHIVO_PRODUCTOS)) {
      const datos = fs.readFileSync(ARCHIVO_PRODUCTOS, 'utf-8');
      return JSON.parse(datos);
    }
  } catch (error) {
    console.error('Error al cargar productos:', error.message);
  }
  return [];
}

// Guardar productos en el archivo
function guardarProductos(productos) {
  try {
    fs.writeFileSync(ARCHIVO_PRODUCTOS, JSON.stringify(productos, null, 2));
  } catch (error) {
    console.error('Error al guardar productos:', error.message);
  }
}

// ========== RUTAS API ==========

// GET - Obtener todos los productos
app.get('/api/productos', (req, res) => {
  const productos = cargarProductos();
  res.json(productos);
});

// GET - Obtener un producto por ID
app.get('/api/productos/:id', (req, res) => {
  const productos = cargarProductos();
  const producto = productos.find(p => p.id === parseInt(req.params.id));
  
  if (!producto) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  
  res.json(producto);
});

// POST - Crear un nuevo producto
app.post('/api/productos', (req, res) => {
  const { nombre, precio, cantidad, descripcion } = req.body;
  
  // Validar datos
  if (!nombre || precio === undefined || cantidad === undefined) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }
  
  const productos = cargarProductos();
  
  const nuevoProducto = {
    id: productos.length > 0 ? Math.max(...productos.map(p => p.id)) + 1 : 1,
    nombre: nombre.trim(),
    precio: parseFloat(precio),
    cantidad: parseInt(cantidad),
    descripcion: descripcion ? descripcion.trim() : '',
    fechaCreacion: new Date().toISOString()
  };
  
  productos.push(nuevoProducto);
  guardarProductos(productos);
  
  console.log('✓ Producto registrado:', nuevoProducto.nombre);
  res.status(201).json(nuevoProducto);
});

// PUT - Actualizar un producto
app.put('/api/productos/:id', (req, res) => {
  const { nombre, precio, cantidad, descripcion } = req.body;
  const productos = cargarProductos();
  const index = productos.findIndex(p => p.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  
  const productoActualizado = {
    ...productos[index],
    nombre: nombre ? nombre.trim() : productos[index].nombre,
    precio: precio !== undefined ? parseFloat(precio) : productos[index].precio,
    cantidad: cantidad !== undefined ? parseInt(cantidad) : productos[index].cantidad,
    descripcion: descripcion !== undefined ? descripcion.trim() : productos[index].descripcion
  };
  
  productos[index] = productoActualizado;
  guardarProductos(productos);
  
  console.log('✓ Producto actualizado:', productoActualizado.nombre);
  res.json(productoActualizado);
});

// DELETE - Eliminar un producto
app.delete('/api/productos/:id', (req, res) => {
  const productos = cargarProductos();
  const index = productos.findIndex(p => p.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  
  const eliminado = productos.splice(index, 1);
  guardarProductos(productos);
  
  console.log('✓ Producto eliminado:', eliminado[0].nombre);
  res.json({ mensaje: 'Producto eliminado correctamente', producto: eliminado[0] });
});

// ========== RUTA PRINCIPAL ==========
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== INICIAR SERVIDOR ==========
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   SISTEMA DE REGISTRO DE PRODUCTOS   ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log(`✓ Servidor ejecutándose en: http://localhost:${PORT}`);
  console.log(`✓ Abre tu navegador y accede a: http://localhost:${PORT}`);
  console.log('\nPresiona Ctrl+C para detener el servidor\n');
});

// Exportar funciones
module.exports = { cargarProductos, guardarProductos };