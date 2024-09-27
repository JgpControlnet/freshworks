let presupuestos = [];
document.onreadystatechange = function () {
  if (document.readyState === 'interactive') renderApp();
  function renderApp() {
    var onInit = app.initialized();

    // onInit.then(getClient).catch(handleErr);

    


  }
};

async function createDocumentQuote() {
  const onInit = app.initialized();

  onInit.then(function (_client) {
    window.client = _client;
    client.data.get("deal").then(function (dealData) {
      const sumarMes = (fecha) => {
        // Sumar un mes a la fecha
        fecha.setMonth(fecha.getMonth() + 1);
        return fecha;
      };

      // Crear una nueva fecha
      let fechaActual = new Date();

      // Obtener la fecha dentro de un mes
      let fechaDentroDeUnMes = sumarMes(fechaActual);

      // Mostrar la fecha en el formato deseado
      console.log(fechaDentroDeUnMes.toString());

      let body = {};

      body.deal_id = parseInt(dealData.deal.id);
      body.contact_id = parseInt(dealData.deal.contact_ids[0]);
      body.sales_account_id = parseInt(dealData.deal.sales_account_id);
      body.document_type = "Quote";
      body.stage = "Draft";
      body.valid_till = fechaDentroDeUnMes.toString();

      getAccount(dealData.deal.sales_account_id)
        .then((salesAccount) => {
          if (salesAccount) {
            let account = JSON.parse(salesAccount.response).sales_account;
            console.log("account", account);
            body.shipping_address = account.address;
            body.shipping_city = account.city;
            body.shipping_state = account.state;
            body.shipping_zipcode = account.zipcode;
            body.shipping_country = account.country;
            body.billing_address = account.address;
            body.billing_city = account.city;
            body.billing_state = account.state;
            body.billing_zipcode = account.zipcode;
            body.billing_country = account.country;
          } else {
            console.log("Failed to retrieve the account.");
          }

          body.amount = "100";
          body.display_name = "test";
          body.currency_code = "EUR";
          body.owner_id = parseInt(dealData.deal.owner_id);
          body.territory_id = 1;
          body.cpq_document_template_name = "Sample Template";

          console.log("body", body);
          createQuote(body)
            .then((quote)=>{
              console.log("quote",quote)
              let docQuote = JSON.parse(quote.response)
              let products = [{"id":1,"quantity":1,"discount":0,"billing_cycle":6,"unit_price":2000,"setup_fee":200},{"id":2,"quantity":2,"discount":10}];
              let cuerpo = {};
              cuerpo.cpq_document = {};
              cuerpo.cpq_document.products = products;

              console.log(cuerpo)

              addProducts(docQuote.id,products)
            })
          


        })
        .catch((error) => {
          console.error("Error while fetching the account:", error);
        });
    }).catch(function (error) {
      console.error("Error fetching deal context: ", error);
    });

  });
}



async function getAccount(account_id) {
  try {
    let data = await client.request.invokeTemplate("getAccount", { "context": { "id": account_id } })
    return data
    // console.log(JSON.stringify(data))
  } catch (err) {
    console.log(err)
  }


}

async function createQuote(body) {
  try {
    console.log(body)
    let data = await client.request.invokeTemplate("createQuote",  { "context": {  }  , "body": JSON.stringify(body) })
    console.log(JSON.parse(data.response))
    return data
  } catch (err) {
    console.log(err)
  }


  


}

async function addProducts(id,body) {
  try {
    let data = await client.request.invokeTemplate("addProductsQuote",  { "context": { id }  , "body": JSON.stringify(body)  })
    console.log(JSON.parse(data.response))
  } catch (err) {
    console.log(err)
  }

}

const productForm = document.getElementById('productForm');
const productTable = document.getElementById('productTable').querySelector('tbody');
const subtotalElement = document.getElementById('subtotal');
const taxesElement = document.getElementById('taxes');
const totalElement = document.getElementById('total');
let subtotal = 0;

const taxRate = 0.10; // 10% tax
let data = { presupuesto: [] };

productForm.addEventListener('submit', function (event) {
  event.preventDefault();

  const productName = document.getElementById('productName').value;
  const productPrice = parseFloat(document.getElementById('productPrice').value);
  const productQuantity = parseInt(document.getElementById('productQuantity').value);
  const productSubtotal = productPrice * productQuantity;

  const productData = {
    name: productName,
    price: productPrice,
    quantity: productQuantity,
    subtotal: productSubtotal
  };

  // Add product data to the JSON object
  data.presupuesto.push(productData);
  console.log(data)

  const row = document.createElement('tr');
  row.innerHTML = `
              <td>${productName}</td>
              <td>${productPrice.toFixed(2)}</td>
              <td>${productQuantity}</td>
              <td class="product-subtotal">${productSubtotal.toFixed(2)}</td>
              <td>
                  <button class="edit-button">Edit</button>
                  <button class="delete-button">Delete</button>
              </td>
          `;

  productTable.appendChild(row);
  updateSubtotal(productSubtotal);

  // Reset the form
  productForm.reset();

  // Add event listeners for buttons
  row.querySelector('.delete-button').addEventListener('click', function () {
    deleteProduct(row, productData);
  });

  row.querySelector('.edit-button').addEventListener('click', function () {
    editProduct(row, productData);
  });

  console.log('Current Data:', JSON.stringify(data)); // Log current data
});

function updateSubtotal(amount) {
  subtotal += amount;
  subtotalElement.textContent = subtotal.toFixed(2);
  updateTaxesAndTotal();
}

function deleteProduct(row, productData) {
  const productSubtotal = parseFloat(row.querySelector('.product-subtotal').textContent);
  subtotal -= productSubtotal;
  subtotalElement.textContent = subtotal.toFixed(2);
  productTable.removeChild(row);

  // Remove product data from the JSON object
  data.presupuesto = data.presupuesto.filter(item => item !== productData);
  updateTaxesAndTotal();

  console.log('Current Data after deletion:', JSON.stringify(data)); // Log current data
}

function editProduct(row, productData) {
  // const newProductName = prompt("New product name:", productData.name);
  // const newProductPrice = prompt("New price:", productData.price);
  // const newProductQuantity = prompt("New quantity:", productData.quantity);

  if (newProductName !== null && newProductPrice !== null && newProductQuantity !== null) {
    const newSubtotal = parseFloat(newProductPrice) * parseInt(newProductQuantity);
    const oldSubtotal = parseFloat(row.querySelector('.product-subtotal').textContent);

    row.cells[0].textContent = newProductName;
    row.cells[1].textContent = parseFloat(newProductPrice).toFixed(2);
    row.cells[2].textContent = parseInt(newProductQuantity);
    row.querySelector('.product-subtotal').textContent = newSubtotal.toFixed(2);

    // Update subtotal
    subtotal += (newSubtotal - oldSubtotal);
    subtotalElement.textContent = subtotal.toFixed(2);
    productData.name = newProductName;
    productData.price = parseFloat(newProductPrice);
    productData.quantity = parseInt(newProductQuantity);
    productData.subtotal = newSubtotal;

    updateTaxesAndTotal();
    console.log('Current Data after edit:', JSON.stringify(data)); // Log current data
  }
}

function updateTaxesAndTotal() {
  const taxes = subtotal * taxRate;
  const total = subtotal + taxes;

  taxesElement.textContent = taxes.toFixed(2);
  totalElement.textContent = total.toFixed(2);
}





function StoreQuotes() {
  const onInit = app.initialized();

  onInit.then(function (_client) {
    window.client = _client;
    client.db.set("Quotes", data).then(
      function () {
        console.log("stored Ok")
        // success operation
        // "data" value is { "Created" : true }
      },
      function (error) {
        // failure operation
        console.log(error)
      });
  });

}

function storeDataStorage() {
  const onInit = app.initialized();

  onInit.then(function (_client) {
    window.client = _client;

    // Verificamos si el array 'presupuesto' no está vacío
    if (data.presupuesto.length > 0) {
      console.log("Products in current presupuesto:", data.presupuesto);

      const taxes = subtotal * taxRate;
      const total = subtotal + taxes;
      // Creamos un nuevo presupuesto con una fecha u otros detalles si es necesario
      const newPresupuesto = {
        id: Date.now(), // Un identificador único, puede ser un timestamp
        productos: [...data.presupuesto], // Los productos dentro del presupuesto
        fechaCreacion: new Date().toISOString(), // Agregar fecha de creación
        price: total.toFixed(2) // Precio total del presupuesto
      };

      // Intentamos obtener 'Quotes' de la base de datos
      client.db.get("Quotes").then(
        function (quotesData) {
          // Verificamos si 'Quotes' es un objeto y tiene un array 'presupuestos'
          if (typeof quotesData === 'object' && Array.isArray(quotesData.presupuestos)) {
            console.log("Quotes exists. Current presupuestos:", quotesData.presupuestos);

            // Añadimos el nuevo presupuesto al array existente de presupuestos
            quotesData.presupuestos.push(newPresupuesto);

            // Guardamos el objeto actualizado con el nuevo array de presupuestos
            client.db.set("Quotes", quotesData).then(
              function (response) {
                console.log("New presupuesto added successfully:", response);
                closeModalAndReload();
              },
              function (error) {
                console.error("Error updating Quotes:", error);
              }
            );
          } else {
            // Si 'Quotes' no tiene un array 'presupuestos', lo inicializamos
            console.log("Quotes does not have a 'presupuestos' array, initializing.");
            const newQuotes = {
              presupuestos: [newPresupuesto] // Nuevo array con el presupuesto
            };

            // Guardamos el nuevo objeto
            client.db.set("Quotes", newQuotes).then(
              function (response) {
                console.log("Quotes initialized and presupuesto stored:", response);
              },
              function (error) {
                console.error("Error initializing and storing Quotes:", error);
              }
            );
          }
        },
        function () {
          // Si 'Quotes' no existe, lo creamos como un objeto con un array 'presupuestos'
          console.log("Quotes key does not exist, creating it.");
          const newQuotes = {
            presupuestos: [newPresupuesto] // Un array que contiene el nuevo presupuesto
          };

          client.db.set("Quotes", newQuotes).then(
            function (response) {
              console.log("Quotes created and presupuesto stored:", response);
            },
            function (error) {
              console.error("Error creating and storing Quotes:", error);
            }
          );
        }
      );
    } else {
      console.error("Error: presupuesto array is empty.");
    }
  });
}





async function getQuote() {
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
    client.db.get("Quotes").then(function (quotesData) {
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
          client.db.set("Quotes", quotesData).then(function () {
            console.log("Presupuesto actualizado correctamente en la base de datos.");
            cargarPresupuestos(); // Recargar la lista de presupuestos (opcional)

          }).catch(function (error) {
            console.error("Error al actualizar el presupuesto en la base de datos:", error);
          });
        } else {
          console.error("No se encontró el presupuesto en la base de datos.");
        }
      } else {
        console.error("No se encontraron presupuestos en la base de datos.");
      }
    }).catch(function (error) {
      console.error("Error al obtener los datos de 'Quotes':", error);
    });
  });

}

function limpiarQuotes() {
  const onInit = app.initialized();

  onInit.then(function (_client) {
    window.client = _client;



    // Obtener los datos actuales de 'Quotes'
    client.db.get("Quotes").then(function (quotesData) {
      if (typeof quotesData === 'object') {
        // Resetear el array de presupuestos a un array vacío
        const datosLimpios = {
          presupuestos: [] // Dejar el array vacío
        };

        // Guardar los datos limpios en la base de datos
        client.db.set("Quotes", datosLimpios).then(function () {
          console.log("Quotes ha sido limpiado correctamente.");
        }).catch(function (error) {
          console.error("Error al limpiar Quotes:", error);
        });
      } else {
        console.error("No se encontró la estructura de datos de Quotes.");
      }
    }).catch(function (error) {
      console.error("Error al obtener los datos de Quotes:", error);
    });
  });
}


function onAppActivate() {
  var btn = document.querySelector('.btn-open');
  btn.addEventListener('click', openModal);
  // Start writing your code...

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


//   client.request.invokeTemplate("getData", {
//   context: {"Authorization":"Token token=ibp6o4rZYuu33aq6botXlQ"},
// });

async function getDeal(deal_id) {
  try {
    let data = await client.request.invokeTemplate("getDeal", { "context": { "id": deal_id } })
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

