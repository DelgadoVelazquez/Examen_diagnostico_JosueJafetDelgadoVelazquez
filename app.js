const express = require('express');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.json());
app.use(express.static(__dirname));

const DB_PATH = path.join(__dirname, 'database.sqlite');
const ARCHIVO_PRODUCTOS = path.join(__dirname, 'productos.json');
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    cantidad INTEGER NOT NULL,
    descripcion TEXT DEFAULT '',
    fechaCreacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

function migrarProductosDesdeJson() {
  const totalProductos = db.prepare('SELECT COUNT(*) AS total FROM productos').get().total;

  if (totalProductos > 0 || !fs.existsSync(ARCHIVO_PRODUCTOS)) {
    return;
  }

  try {
    const datos = fs.readFileSync(ARCHIVO_PRODUCTOS, 'utf-8');
    const productos = JSON.parse(datos);

    if (!Array.isArray(productos) || productos.length === 0) {
      return;
    }

    const insertarProducto = db.prepare(`
      INSERT INTO productos (id, nombre, precio, cantidad, descripcion, fechaCreacion)
      VALUES (@id, @nombre, @precio, @cantidad, @descripcion, @fechaCreacion)
    `);

    const transaccion = db.transaction((items) => {
      for (const producto of items) {
        insertarProducto.run({
          id: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          cantidad: producto.cantidad,
          descripcion: producto.descripcion || '',
          fechaCreacion: producto.fechaCreacion || new Date().toISOString()
        });
      }
    });

    transaccion(productos);
    console.log(`✓ Migrados ${productos.length} productos desde productos.json a SQLite`);
  } catch (error) {
    console.error('Error al migrar productos a SQLite:', error.message);
  }
}

migrarProductosDesdeJson();



function cargarProductos() {
  try {
    return db.prepare('SELECT * FROM productos ORDER BY id ASC').all();
  } catch (error) {
    console.error('Error al cargar productos:', error.message);
  }
  return [];
}

function obtenerProductoPorId(id) {
  try {
    return db.prepare('SELECT * FROM productos WHERE id = ?').get(id);
  } catch (error) {
    console.error('Error al obtener producto:', error.message);
  }
  return null;
}

function crearProducto({ nombre, precio, cantidad, descripcion }) {
  const resultado = db.prepare(`
    INSERT INTO productos (nombre, precio, cantidad, descripcion, fechaCreacion)
    VALUES (?, ?, ?, ?, ?)
  `).run(nombre, precio, cantidad, descripcion, new Date().toISOString());

  return obtenerProductoPorId(resultado.lastInsertRowid);
}

function actualizarProducto(id, datos) {
  const productoActual = obtenerProductoPorId(id);

  if (!productoActual) {
    return null;
  }

  const nombreFinal = datos.nombre !== undefined ? datos.nombre.trim() : productoActual.nombre;
  const precioFinal = datos.precio !== undefined ? parseFloat(datos.precio) : productoActual.precio;
  const cantidadFinal = datos.cantidad !== undefined ? parseInt(datos.cantidad) : productoActual.cantidad;
  const descripcionFinal = datos.descripcion !== undefined ? datos.descripcion.trim() : productoActual.descripcion;

  db.prepare(`
    UPDATE productos
    SET nombre = ?, precio = ?, cantidad = ?, descripcion = ?
    WHERE id = ?
  `).run(nombreFinal, precioFinal, cantidadFinal, descripcionFinal, id);

  return obtenerProductoPorId(id);
}

function borrarProducto(id) {
  const producto = obtenerProductoPorId(id);

  if (!producto) {
    return null;
  }

  db.prepare('DELETE FROM productos WHERE id = ?').run(id);
  return producto;
}


app.get('/api/productos', (req, res) => {
  const productos = cargarProductos();
  res.json(productos);
});

// GET - Obtener un producto por ID
app.get('/api/productos/:id', (req, res) => {
  const producto = obtenerProductoPorId(parseInt(req.params.id));

  if (!producto) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }

  res.json(producto);
});


app.post('/api/productos', (req, res) => {
  const { nombre, precio, cantidad, descripcion } = req.body;

  if (!nombre || precio === undefined || cantidad === undefined) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  const nuevoProducto = crearProducto({
    nombre: nombre.trim(),
    precio: parseFloat(precio),
    cantidad: parseInt(cantidad),
    descripcion: descripcion ? descripcion.trim() : ''
  });

  console.log('✓ Producto registrado:', nuevoProducto.nombre);
  res.status(201).json(nuevoProducto);
});


app.put('/api/productos/:id', (req, res) => {
  const { nombre, precio, cantidad, descripcion } = req.body;
  const productoActualizado = actualizarProducto(parseInt(req.params.id), { nombre, precio, cantidad, descripcion });

  if (!productoActualizado) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }

  console.log('✓ Producto actualizado:', productoActualizado.nombre);
  res.json(productoActualizado);
});


app.delete('/api/productos/:id', (req, res) => {
  const productoEliminado = borrarProducto(parseInt(req.params.id));

  if (!productoEliminado) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }

  console.log('✓ Producto eliminado:', productoEliminado.nombre);
  res.json({ mensaje: 'Producto eliminado correctamente', producto: productoEliminado });
});


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


function iniciarServidor(puerto) {
  const server = app.listen(puerto, () => {
    const direccion = server.address();
    const puertoUsado = typeof direccion === 'object' && direccion ? direccion.port : puerto;

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   SISTEMA DE REGISTRO DE PRODUCTOS   ║');
    console.log('╚════════════════════════════════════════╝\n');
    console.log(`✓ Base de datos SQLite: ${DB_PATH}`);
    console.log(`✓ Servidor ejecutándose en: http://localhost:${puertoUsado}`);
    console.log(`✓ Abre tu navegador y accede a: http://localhost:${puertoUsado}`);
    console.log('\nPresiona Ctrl+C para detener el servidor\n');
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`⚠️ El puerto ${puerto} está ocupado. Probando con ${puerto + 1}...`);
      iniciarServidor(puerto + 1);
      return;
    }

    throw error;
  });
}

iniciarServidor(Number(PORT));

module.exports = { cargarProductos, obtenerProductoPorId, crearProducto, actualizarProducto, borrarProducto };