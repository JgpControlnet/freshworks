let presupuestos = [];
document.onreadystatechange = function() {
  if (document.readyState === 'interactive') renderApp();
  function renderApp() {
    var onInit = app.initialized();

    onInit.then(getClient).catch(handleErr);

    function getClient(_client) {
      window.client = _client;
      client.events.on('app.activated', onAppActivate);

      client.data.get("deal").then(function (dealData) {
        console.log(dealData)
        // const dealId = dealData.deal.id;        // ID of the deal
        // const dealName = dealData.deal.name;    // Name of the deal
        
        // getDeal(dealData.deal.id);
        // Now you can use the deal information in your app
        // console.log("Deal ID: ", dealId);
        // console.log("Deal Name: ", dealName);
        
        getContact(dealData.deal.contact_ids[0]);
        getAccount(dealData.deal.account_id);
      }).catch(function (error) {
        console.error("Error fetching deal context: ", error);
      });
      
      
    getQuote();
    // limpiarQuotes();
    }

    
  }
};

async function getQuote(){
  try {
    let data = await client.db.get("Quotes");
    console.log(data)
    presupuestos = data.presupuestos;
    cargarPresupuestos();
    // success
    // "data" is { "jiraIssueId": 15213 }
} catch (error) {
    console.error(error)
}
}

function cargarPresupuestos() {
  const tablaBody = document.querySelector("#tabla-presupuestos tbody");
  tablaBody.innerHTML = ''; // Limpiar la tabla antes de cargar

  presupuestos.forEach(presupuesto => {
      const fila = document.createElement('tr');

      // Crear columnas para ID, Fecha y Precio
      fila.innerHTML = `
          <td>${presupuesto.id}</td>
          <td>${new Date(presupuesto.fechaCreacion).toLocaleString()}</td>
          <td>${presupuesto.price}</td>
          <td><button onclick="editarPresupuesto(${presupuesto.id})">Editar</button></td>
      `;

      tablaBody.appendChild(fila);
  });
}



function closeModalAndReload() {

  client.instance.close(); // Cierra el modal
}

// Función para mostrar la vista de edición de un presupuesto
function editarPresupuesto(id) {
  const presupuesto = presupuestos.find(p => p.id === id);
  if (!presupuesto) return;

  // Ocultar la tabla de presupuestos y mostrar la vista de edición
  document.querySelector("#tabla-presupuestos").style.display = 'none';
  document.querySelector("#vista-edicion").style.display = 'block';
  document.querySelector("#vista-edicion #idPresupuesto").innerHTML = id;


  // Mostrar los productos del presupuesto seleccionado
  const tablaBody = document.querySelector("#tabla-edicion tbody");
  tablaBody.innerHTML = ''; // Limpiar la tabla antes de cargar

  presupuesto.productos.forEach(producto => {
      // Normalizar el nombre del producto para usarlo en los IDs (reemplazando espacios y caracteres especiales)
      const nombreProductoID = producto.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

      const fila = document.createElement('tr');

      // Crear las celdas de la tabla con los productos y la funcionalidad de editar
      fila.innerHTML = `
          <td>${producto.name}</td>
          <td>
              <input id="productQuantity_${nombreProductoID}" onchange="updateSubtotalProduct('${nombreProductoID}', ${producto.price})" type="number" value="${producto.quantity}" min="1"/>
          </td>
          <td>${producto.price}</td>
          <td id="productSubtotal_${nombreProductoID}">${producto.quantity * producto.price}</td>
      `;

      tablaBody.appendChild(fila);
  });
}

function updateSubtotalProduct(nombreProductoID, precio) {
  // Obtener los elementos correspondientes al campo de cantidad y la celda de subtotal
  const quantityInput = document.getElementById(`productQuantity_${nombreProductoID}`);
  const subtotalCell = document.getElementById(`productSubtotal_${nombreProductoID}`);

  // Revisar en la consola si se encuentran los elementos
  console.log('Cantidad input:', quantityInput);
  console.log('Subtotal cell:', subtotalCell);

  if (!quantityInput || !subtotalCell) {
      console.error('No se pudo encontrar los elementos del producto:', nombreProductoID);
      return;
  }

  // Asegurarse de que quantityInput tenga valor
  const cantidad = parseFloat(quantityInput.value) || 0;

  // Calcular el nuevo subtotal
  const nuevoSubtotal = cantidad * precio;

  // Actualizar el contenido de la celda de subtotal
  subtotalCell.textContent = nuevoSubtotal.toFixed(2);

  // Actualizar directamente el presupuesto en el array
  presupuestos.forEach(presupuesto => {
      const producto = presupuesto.productos.find(p => p.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') === nombreProductoID);
      if (producto) {
          producto.quantity = cantidad;  // Actualizamos la cantidad del producto
          producto.subtotal = nuevoSubtotal; // Actualizamos el subtotal del producto
      }
  });

  console.log(presupuestos)
}


// Función para volver a la lista de presupuestos
function volverALista() {
  document.querySelector("#tabla-presupuestos").style.display = 'table';
  document.querySelector("#vista-edicion").style.display = 'none';

  const presupuestoActualID = parseInt(document.querySelector("#vista-edicion #idPresupuesto").innerHTML);
  console.log(presupuestoActualID)

  const onInit = app.initialized();

  onInit.then(function (_client) {
      window.client = _client;

      // Intentamos obtener 'Quotes' de la base de datos
      client.db.get("Quotes").then(function(quotesData) {
          if (typeof quotesData === 'object' && Array.isArray(quotesData.presupuestos)) {
              console.log("Datos de Quotes obtenidos:", quotesData);

              // Asegúrate de que el ID del presupuesto que se está editando sea el correcto
              const presupuestoEditado = presupuestos.find(p => p.id === presupuestoActualID);
              if (!presupuestoEditado) {
                  console.error("No se encontró el presupuesto que fue editado.");
                  return;
              }

              // Imprimir el presupuesto que se está intentando actualizar
              console.log("Presupuesto que se intenta actualizar:", presupuestoEditado);

              // Calcular el nuevo total del presupuesto sumando los subtotales de los productos
              let nuevoTotal = 0;
              presupuestoEditado.productos.forEach(producto => {
                  const subtotalProducto = producto.price * producto.quantity; // Calcular subtotal de cada producto
                  nuevoTotal += subtotalProducto; // Sumar al total del presupuesto
              });

              // Actualizar el campo 'price' del presupuesto con el nuevo total
              presupuestoEditado.price = nuevoTotal.toFixed(2); // Formatear a 2 decimales

              // Buscar el presupuesto en el array de Quotes por ID
              const index = quotesData.presupuestos.findIndex(p => p.id === presupuestoEditado.id);
              if (index !== -1) {
                  console.log("Presupuesto encontrado en la base de datos, índice:", index);

                  // Actualizar el presupuesto con los nuevos valores
                  quotesData.presupuestos[index] = {
                      ...quotesData.presupuestos[index],
                      productos: [...presupuestoEditado.productos], // Actualizar los productos editados
                      price: presupuestoEditado.price, // Actualizar el precio total con el nuevo cálculo
                      fechaModificacion: new Date().toISOString() // Añadir o actualizar la fecha de modificación
                  };

                  // Verificar los datos antes de guardarlos
                  console.log("Datos actualizados que se guardarán:", quotesData.presupuestos[index]);

                  // Guardar los cambios en la base de datos
                  client.db.set("Quotes", quotesData).then(function() {
                      console.log("Presupuesto actualizado correctamente en la base de datos.");
  cargarPresupuestos(); // Recargar la lista de presupuestos (opcional)

                  }).catch(function(error) {
                      console.error("Error al actualizar el presupuesto en la base de datos:", error);
                  });
              } else {
                  console.error("No se encontró el presupuesto en la base de datos.");
              }
          } else {
              console.error("No se encontraron presupuestos en la base de datos.");
          }
      }).catch(function(error) {
          console.error("Error al obtener los datos de 'Quotes':", error);
      });
  });

}

function limpiarQuotes() {
  const onInit = app.initialized();

  onInit.then(function (_client) {
      window.client = _client;

      // Obtener los datos actuales de 'Quotes'
      client.db.get("Quotes").then(function(quotesData) {
          if (typeof quotesData === 'object') {
              // Resetear el array de presupuestos a un array vacío
              const datosLimpios = {
                  presupuestos: [] // Dejar el array vacío
              };

              // Guardar los datos limpios en la base de datos
              client.db.set("Quotes", datosLimpios).then(function() {
                  console.log("Quotes ha sido limpiado correctamente.");
              }).catch(function(error) {
                  console.error("Error al limpiar Quotes:", error);
              });
          } else {
              console.error("No se encontró la estructura de datos de Quotes.");
          }
      }).catch(function(error) {
          console.error("Error al obtener los datos de Quotes:", error);
      });
  });
}


function onAppActivate() {
  var btn = document.querySelector('.btn-open');
  btn.addEventListener('click', openModal);
  // Start writing your code...
  
}

async function openModal(){
  client.interface.trigger(
    'showModal',
    useTemplate('New Quote', './views/modal.html')
  );
}

async function getData() {
      try {
        let data = await client.request.invokeTemplate("getData", {})
        console.log(data);
        let datos = JSON.parse(data.response);
        console.log(datos.filters)

        let content = document.getElementById('content');
        datos.filters.forEach(element => {
          console.log(element);
          content.innerHTML += `<div class="content_div">
    <p>${element.id}</p>
    <p>${element.name}</p>
    <p>${element.model_class_name}</p>
  </div>`
        });
        // console.log(JSON.stringify(data))
      } catch (err) {
        console.log(err)
      }


  }

  async function getContact(contact_id) {
    try {
      let data = await client.request.invokeTemplate("getContact", {"context": { "id": contact_id }})
      console.log(data);
      let datos = JSON.parse(data.response);
      console.log(datos.contact)
      return datos.contact
      
      // console.log(JSON.stringify(data))
    } catch (err) {
      console.log(err)
    }


  }
  async function getAccount(account_id) {
    try {
      let data = await client.request.invokeTemplate("getContact", {"context": { "id": account_id }})
      console.log(data);
      let datos = JSON.parse(data.response);
      console.log(datos)
      
      // console.log(JSON.stringify(data))
    } catch (err) {
      console.log(err)
    }


}
//   client.request.invokeTemplate("getData", {
//   context: {"Authorization":"Token token=ibp6o4rZYuu33aq6botXlQ"},
// });

async function getDeal(deal_id) {
      try {
        let data = await client.request.invokeTemplate("getDeal", {"context": { "id": deal_id }})
        console.log(JSON.parse(data.response));
        let deal = JSON.parse(data.response).deal;
        console.log(deal.products)

        let content = document.getElementById('content');
        deal.products.forEach(element => {
          console.log(element);
          content.innerHTML += `<div class="content_div">
    <p>${element.name}</p>
    <p>${element.id}</p>
    <p>${element.unit_price}</p>
  </div>`
});
      } catch (err) {
        console.log(err)
      }
  }

function useTemplate(title, template) {
  return {
    title,
    template
  };
}

function handleErr(err) {
  console.error(`Error occured. Details:`, err);
}

