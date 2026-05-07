// Elements
const form = document.getElementById('productoForm');
const nombre = document.getElementById('nombre');
const precio = document.getElementById('precio');
const cantidad = document.getElementById('cantidad');
const descripcion = document.getElementById('descripcion');
const productosContainer = document.getElementById('productosContainer');
const btnRefresh = document.getElementById('btnRefresh');
const searchInput = document.getElementById('buscar');
const orderSelect = document.getElementById('ordenar');
const modal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const closeBtn = document.querySelector('.close');
const btnCancelar = document.getElementById('btnCancelar');
const notificacion = document.getElementById('notificacion');

let allProductos = [];

// Event Listeners
form.addEventListener('submit', handleRegistrarProducto);
btnRefresh.addEventListener('click', cargarProductos);
searchInput.addEventListener('input', filtrarProductos);
orderSelect.addEventListener('change', ordenarProductos);
editForm.addEventListener('submit', handleActualizarProducto);
closeBtn.addEventListener('click', cerrarModal);
btnCancelar.addEventListener('click', cerrarModal);

// Cargar productos al iniciar
document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
});

// Registrar nuevo producto
async function handleRegistrarProducto(e) {
    e.preventDefault();

    const nuevoProducto = {
        nombre: nombre.value.trim(),
        precio: parseFloat(precio.value),
        cantidad: parseInt(cantidad.value),
        descripcion: descripcion.value.trim()
    };

    if (!nuevoProducto.nombre || isNaN(nuevoProducto.precio) || isNaN(nuevoProducto.cantidad)) {
        mostrarNotificacion('Por favor completa los campos requeridos correctamente', 'error');
        return;
    }

    try {
        const response = await fetch('/api/productos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nuevoProducto)
        });

        if (response.ok) {
            mostrarNotificacion('Producto registrado exitosamente', 'success');
            form.reset();
            cargarProductos();
        } else {
            mostrarNotificacion('Error al registrar el producto', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error de conexión', 'error');
    }
}

// Cargar productos
async function cargarProductos() {
    productosContainer.innerHTML = '<p class="loading">Cargando productos...</p>';
    
    try {
        const response = await fetch('/api/productos');
        allProductos = await response.json();
        mostrarProductos(allProductos);
    } catch (error) {
        console.error('Error:', error);
        productosContainer.innerHTML = '<p class="loading">Error al cargar productos</p>';
    }
}

// Mostrar productos
function mostrarProductos(productos) {
    if (productos.length === 0) {
        productosContainer.innerHTML = '<p class="loading">No hay productos registrados</p>';
        return;
    }

    productosContainer.innerHTML = productos.map(producto => `
        <div class="producto-card">
            <div class="producto-id">ID: ${producto.id}</div>
            <div class="producto-nombre">${producto.nombre}</div>
            <div class="producto-descripcion">${producto.descripcion || 'Sin descripción'}</div>
            
            <div class="producto-info">
                <div class="info-item">
                    <span class="info-label">Precio</span>
                    <span class="info-value precio">$${producto.precio.toFixed(2)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Cantidad</span>
                    <span class="info-value cantidad">${producto.cantidad} unidades</span>
                </div>
            </div>

            <div class="producto-acciones">
                <button class="btn btn-warning" onclick="abrirModal(${producto.id})">Editar</button>
                <button class="btn btn-danger" onclick="eliminarProducto(${producto.id})">Eliminar</button>
            </div>
        </div>
    `).join('');
}

// Filtrar productos
function filtrarProductos() {
    const termino = searchInput.value.toLowerCase();
    const filtrados = allProductos.filter(p => 
        p.nombre.toLowerCase().includes(termino)
    );
    mostrarProductos(filtrados);
}

// Ordenar productos
function ordenarProductos() {
    const tipo = orderSelect.value;
    let ordenados = [...allProductos];

    switch(tipo) {
        case 'nombre':
            ordenados.sort((a, b) => a.nombre.localeCompare(b.nombre));
            break;
        case 'precio':
            ordenados.sort((a, b) => a.precio - b.precio);
            break;
        case 'cantidad':
            ordenados.sort((a, b) => a.cantidad - b.cantidad);
            break;
        case 'id':
        default:
            ordenados.sort((a, b) => a.id - b.id);
    }

    mostrarProductos(ordenados);
}

// Abrir modal de edición
function abrirModal(id) {
    const producto = allProductos.find(p => p.id === id);
    if (!producto) return;

    document.getElementById('editId').value = producto.id;
    document.getElementById('editNombre').value = producto.nombre;
    document.getElementById('editPrecio').value = producto.precio;
    document.getElementById('editCantidad').value = producto.cantidad;
    document.getElementById('editDescripcion').value = producto.descripcion || '';

    modal.classList.add('active');
}

// Cerrar modal
function cerrarModal() {
    modal.classList.remove('active');
}

// Actualizar producto
async function handleActualizarProducto(e) {
    e.preventDefault();

    const id = parseInt(document.getElementById('editId').value);
    const productoActualizado = {
        nombre: document.getElementById('editNombre').value.trim(),
        precio: parseFloat(document.getElementById('editPrecio').value),
        cantidad: parseInt(document.getElementById('editCantidad').value),
        descripcion: document.getElementById('editDescripcion').value.trim()
    };

    try {
        const response = await fetch(`/api/productos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productoActualizado)
        });

        if (response.ok) {
            mostrarNotificacion('Producto actualizado exitosamente', 'success');
            cerrarModal();
            cargarProductos();
        } else {
            mostrarNotificacion('Error al actualizar el producto', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error de conexión', 'error');
    }
}

// Eliminar producto
async function eliminarProducto(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) {
        return;
    }

    try {
        const response = await fetch(`/api/productos/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            mostrarNotificacion('Producto eliminado exitosamente', 'success');
            cargarProductos();
        } else {
            mostrarNotificacion('Error al eliminar el producto', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error de conexión', 'error');
    }
}

// Mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'success') {
    notificacion.textContent = mensaje;
    notificacion.className = `notificacion active ${tipo}`;

    setTimeout(() => {
        notificacion.classList.remove('active');
    }, 4000);
}

// Cerrar modal si se hace click fuera
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        cerrarModal();
    }
});
