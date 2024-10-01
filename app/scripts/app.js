let presupuestos = [];
document.onreadystatechange = function () {
  if (document.readyState === 'interactive') renderApp();
  function renderApp() {
    var onInit = app.initialized();

    onInit.then(function (_client) {
      window.client = _client;
      getDocuments()
      .then((documents) => {
        let documentos = JSON.parse(documents.response)
        console.log(documentos)
        const distinctTemplates = [...new Set(documentos.cpq_documents.map(doc => doc.cpq_document_template_name))];


        const selectElement = document.getElementById('templateSelect');

        distinctTemplates.forEach(template => {
          const option = document.createElement('option');
          option.value = template;
          option.textContent = template;
          selectElement.appendChild(option);
      });
      })
    });

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

      console.log("Deal",dealData)

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

          createQuote(body)
  .then((quote) => {
    let docQuote = JSON.parse(quote.response);
    console.log("docQuote", docQuote);

    // Crear un array de promesas para procesar cada producto
    const productPromises = data.presupuesto.map((product) => {
      return getProduct(product.id)
        .then((producto) => {
          if (producto.status !== 200) {
            console.log("hay que crear el producto", product.id);
            let newProduct = {
              product: {
                name: product.name,
                description: product.description,
                sku_number: product.sku_number,
                base_currency_amount: product.unit_price,
              },
            };

            // Crear el producto si no existe
            return createProduct(newProduct).then((response) => {
              console.log("creaproducto", response);
              let nuevoProducto = JSON.parse(response.response);
              product.id = nuevoProducto.product.id;

              // Obtener y agregar el precio del producto
              return getCurrencies().then((currencies) => {
                console.log(currencies.response);
                let currencieList = JSON.parse(currencies.response);
                console.log("currencieList", currencieList);
                console.log("currency_id", dealData.deal.currency_id);


                let currencyCode = currencieList.currencies.find(
                  (d) => parseInt(d.id) === parseInt(dealData.deal.currency_id)
                );

                console.log("currencyCode", currencyCode);

                let productPrice = {
                  product: {
                    pricing_type: 1,
                    product_pricings: [
                      {
                        currency_code: currencyCode.currency_code,
                        unit_price: product.unit_price,
                      },
                    ],
                  },
                };

                // Agregar el precio del producto
                return addProductPrice(product.id, productPrice);
              });
            });
          } else {
            // Si el producto ya existe, no es necesario crearlo ni agregar precios
            return Promise.resolve();
          }
        });
    });

    // Esperar a que todas las promesas de los productos se resuelvan
    return Promise.all(productPromises)
      .then(() => {
        // Una vez que todos los productos han sido procesados, se llama a addProducts
        let cuerpo = {
          cpq_document: {
            products: data.presupuesto,
          },
        };

        return addProducts(docQuote.cpq_document.id, cuerpo)
      })
      .then(async (respuesta) => {
        // Aquí se maneja la respuesta de addProducts
        console.log("addProducts respuesta:", respuesta);
        if(respuesta.status === 200){
          console.log("Presupuesto creado correctamente");
          try {
            let data = await client.interface.trigger("showNotify", {
              type: "success",
              title: "Success!!", /* The "title" should be plain text */
              message: "The Quote has been created succesfully" /* The "message" should be plain text */
            });
              console.log(data); // success message
              document.querySelector('#productTable tbody').innerHTML = ""
              document.getElementById('productForm').reset()

          } catch (error) {
              // failure operation
              console.error(error);
          }
        }else{
          console.log("Error al crear el presupuesto");
        }
      })
      .catch((error) => {
        console.error("Error procesando los productos o agregando el presupuesto:", error);
      });
  });

          


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

async function getProduct(productId) {
  try {
    let data = await client.request.invokeTemplate("getProduct", { "context": { "id": productId } })
    return data
    // console.log(JSON.stringify(data))
  } catch (err) {
    return err
  }
}

async function getDocuments() {
  try {
    let data = await client.request.invokeTemplate("getDocuments")
    return data
    // console.log(JSON.stringify(data))
  } catch (err) {
    console.log(err)
  }
}

async function getCurrencies() {
  try {
    let data = await client.request.invokeTemplate("getCurrencies")
    return data
  } catch (err) {
    console.log(err)
  }
}

async function createQuote(body) {
  try {
    let data = await client.request.invokeTemplate("createQuote",  { "context": {  }  , "body": JSON.stringify(body) })
    return data
  } catch (err) {
    console.log(err)
  }
}

async function createProduct(body) {
  try {
    console.log(body)
    let data = await client.request.invokeTemplate("createProduct", { "context": {}  , "body": JSON.stringify(body)  })
    console.log(JSON.parse(data.response))
    return data
  } catch (err) {
    console.log(err)
  }
}

async function addProducts(id,body) {
  try {
    console.log(id)
    let data = await client.request.invokeTemplate("addProductsQuote",  { "context": { id }  , "body": JSON.stringify(body)  })
    return data
  } catch (err) {
    return err
  }

}

async function addProductPrice(id,body) {
  try {
    let data = await client.request.invokeTemplate("AddProductPrice",  { "context": { id }  , "body": JSON.stringify(body)  })
    return data
  } catch (err) {
    return err
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
let idProducto = 1;

productForm.addEventListener('submit', function (event) {
  event.preventDefault();

  const productName = document.getElementById('productName').value;
  const productDescription = document.getElementById('description').value;
  const sku_number = document.getElementById('sku_number').value;
  const productPrice = parseFloat(document.getElementById('productPrice').value);
  const productQuantity = parseInt(document.getElementById('productQuantity').value);
  const productSubtotal = productPrice * productQuantity;

  const productData = {
    id : idProducto,
    name: productName,
    description: productDescription,
    sku_number: sku_number,
    unit_price: productPrice,
    quantity: productQuantity,
    subtotal: productSubtotal
  };
  idProducto ++;

  // Add product data to the JSON object
  data.presupuesto.push(productData);
  console.log(data)

  const row = document.createElement('tr');
  row.innerHTML = `
              <td>${productName}</td>
              <td>${productDescription}</td>
              <td>${sku_number}</td>
              <td>${productPrice.toFixed(2)}</td>
              <td>${productQuantity}</td>
              <td class="product-subtotal">${productSubtotal.toFixed(2)}</td>
              <td>
              <div class="flexRow">
                  <button class="edit-button actionButton actionFlex">
                  <svg width="15px" height="15px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M21.2799 6.40005L11.7399 15.94C10.7899 16.89 7.96987 17.33 7.33987 16.7C6.70987 16.07 7.13987 13.25 8.08987 12.3L17.6399 2.75002C17.8754 2.49308 18.1605 2.28654 18.4781 2.14284C18.7956 1.99914 19.139 1.92124 19.4875 1.9139C19.8359 1.90657 20.1823 1.96991 20.5056 2.10012C20.8289 2.23033 21.1225 2.42473 21.3686 2.67153C21.6147 2.91833 21.8083 3.21243 21.9376 3.53609C22.0669 3.85976 22.1294 4.20626 22.1211 4.55471C22.1128 4.90316 22.0339 5.24635 21.8894 5.5635C21.7448 5.88065 21.5375 6.16524 21.2799 6.40005V6.40005Z" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11 4H6C4.93913 4 3.92178 4.42142 3.17163 5.17157C2.42149 5.92172 2 6.93913 2 8V18C2 19.0609 2.42149 20.0783 3.17163 20.8284C3.92178 21.5786 4.93913 22 6 22H17C19.21 22 20 20.2 20 18V13" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
                  Edit
                  </button>
                  <button class="delete-button actionButton actionFlex">
                  <?xml version="1.0" encoding="utf-8"?><!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->
<svg width="15px" height="15px" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="#000000" d="M160 256H96a32 32 0 0 1 0-64h256V95.936a32 32 0 0 1 32-32h256a32 32 0 0 1 32 32V192h256a32 32 0 1 1 0 64h-64v672a32 32 0 0 1-32 32H192a32 32 0 0 1-32-32V256zm448-64v-64H416v64h192zM224 896h576V256H224v640zm192-128a32 32 0 0 1-32-32V416a32 32 0 0 1 64 0v320a32 32 0 0 1-32 32zm192 0a32 32 0 0 1-32-32V416a32 32 0 0 1 64 0v320a32 32 0 0 1-32 32z"/></svg>
                  Delete
                  </button>
                  </div>
              </td>
          `;

  productTable.appendChild(row);
  updateSubtotal();

  // Reset the form
  productForm.reset();

  // Add event listeners for buttons
  row.querySelector('.delete-button').addEventListener('click', function () {
    deleteProduct(productData.id);
  });

  row.querySelector('.edit-button').addEventListener('click', function () {
    editProduct(productData.id);
  });

  console.log('Current Data:', JSON.stringify(data)); // Log current data
});

function updateSubtotal() {
  // Usa reduce para sumar todos los subtotales (price * quantity)
  const total = data.presupuesto.reduce((acumulador, producto) => {
    return acumulador + (producto.unit_price * producto.quantity);
  }, 0);  // Inicializa el acumulador en 0

  subtotal = total;
  subtotalElement.textContent = subtotal.toFixed(2);
  updateTaxesAndTotal();
}

function deleteProduct(idProducto) {
   // Encuentra el índice del producto en el array
   const index = data.presupuesto.findIndex(d => d.id === idProducto);

   if (index !== -1) {  // Si el producto existe en el array
     // Elimina el producto del array
     data.presupuesto.splice(index, 1);
     console.log(`Producto con ID ${idProducto} eliminado exitosamente.`);
   } else {
     console.error("Producto no encontrado");
   }


   let productTable = document.querySelector('#productTable tbody');
   productTable.innerHTML = ""

    data.presupuesto.forEach((product)=>{
      let row = document.createElement('tr')
      row.innerHTML = `
              <td>${product.name}</td>
              <td>${product.description}</td>
              <td>${product.sku_number}</td>
              <td>${product.unit_price.toFixed(2)}</td>
              <td>${product.quantity}</td>
              <td class="product-subtotal">${product.unit_price * product.quantity}</td>
              <td>
                  <button class="edit-button">Edit</button>
                  <button class="delete-button">Delete</button>
              </td>
          `;
          productTable.appendChild(row);
          
          // Add event listeners for buttons
          row.querySelector('.delete-button').addEventListener('click', function () {
            deleteProduct(productoID);
          });
          
          row.querySelector('.edit-button').addEventListener('click', function () {
            editProduct(productoID);
          });
        })
        updateSubtotal();
}

function editProduct(idProducto) {
  
 
  
  const productTable = document.getElementById('tabla-edicion').querySelector('tbody');
  console.log(productTable)
  document.querySelector('#tabla-edicion tbody').innerHTML = ""

  const newRow = document.createElement('tr');

  const product = data.presupuesto.find(d => d.id == idProducto);
if (product) {
  newRow.innerHTML = `
      <td id="productID" class="hidden">${product.id}</td>
      <td>${product.name}</td>
      <td>${product.description}</td>
      <td>${product.sku_number}</td>
      <td><input id="editPrice" onchange="editSubtotal()" type="number" value="${product.unit_price.toFixed(2)}"/></td>
      <td><input id="editQuantity" onchange="editSubtotal()" type="number" value="${product.quantity}"/></td>
      <td id="editSubtotal">${product.unit_price * product.quantity}</td>

  `;
} else {
  console.error("Producto no encontrado");
}
    

 

  
  
  productTable.appendChild(newRow);
  document.getElementById('vista-edicion').style.display = 'block';
  document.getElementById('vista-productos').style.display = 'none';

}

function updateTaxesAndTotal() {
  const taxes = subtotal * taxRate;
  const total = subtotal + taxes;

  taxesElement.textContent = taxes.toFixed(2);
  totalElement.textContent = total.toFixed(2);
}


function editSubtotal(){
    const price = document.getElementById('editPrice')
    const quantity = document.getElementById('editQuantity')
    const subtotal = document.getElementById('editSubtotal')

    subtotal.innerHTML = price.value * quantity.value;
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

// 


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
          <td>${producto.description}</td>
          <td>${producto.sku_number}</td>
          <td>${producto.unit_price}</td>
          <td>
              <input id="productQuantity_${nombreProductoID}" onchange="updateSubtotalProduct('${nombreProductoID}', ${producto.unit_price})" type="number" value="${producto.quantity}" min="1"/>
          </td>
          <td id="productSubtotal_${nombreProductoID}">${producto.quantity * producto.unit_price}</td>
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
  
  document.getElementById('vista-productos').style.display = 'block';
  document.getElementById('vista-edicion').style.display = 'none';
  let productoID = parseInt(document.getElementById('productID').innerHTML);
  console.log(productoID)

  // Encuentra el índice del producto en el array
const index = data.presupuesto.findIndex(d => d.id === productoID);

if (index !== -1) {  // Si el producto existe en el array
  // Convierte y valida los valores obtenidos del DOM
  const newPrice = parseFloat(document.getElementById('editPrice').value);
  const newQuantity = parseInt(document.getElementById('editQuantity').value);

  if (!isNaN(newPrice) && newPrice > 0) {
    data.presupuesto[index].unit_price = newPrice;
  } else {
    console.error("El precio no es válido.");
  }

  if (!isNaN(newQuantity) && newQuantity > 0) {
    data.presupuesto[index].quantity = newQuantity;
  } else {
    console.error("La cantidad no es válida.");
  }

  // Solo actualiza el subtotal si tanto el precio como la cantidad son válidos
  if (!isNaN(data.presupuesto[index].unit_price) && !isNaN(data.presupuesto[index].quantity)) {
    data.presupuesto[index].subtotal = data.presupuesto[index].unit_price * data.presupuesto[index].quantity;
  }

} else {
  console.error("Producto no encontrado");
}
  let productTable = document.querySelector('#productTable tbody');
  productTable.innerHTML = ""

  console.log(data.presupuesto)

  data.presupuesto.forEach((product)=>{
    let row = document.createElement('tr')
    row.innerHTML = `
              <td>${product.name}</td>
              <td>${product.description}</td>
              <td>${product.sku_number}</td>
              <td>${product.unit_price.toFixed(2)}</td>
              <td>${product.quantity}</td>
              <td class="product-subtotal">${product.unit_price * product.quantity}</td>
              <td>
              <div class="flexRow">
                  <button class="edit-button actionButton actionFlex">
                  <svg width="15px" height="15px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M21.2799 6.40005L11.7399 15.94C10.7899 16.89 7.96987 17.33 7.33987 16.7C6.70987 16.07 7.13987 13.25 8.08987 12.3L17.6399 2.75002C17.8754 2.49308 18.1605 2.28654 18.4781 2.14284C18.7956 1.99914 19.139 1.92124 19.4875 1.9139C19.8359 1.90657 20.1823 1.96991 20.5056 2.10012C20.8289 2.23033 21.1225 2.42473 21.3686 2.67153C21.6147 2.91833 21.8083 3.21243 21.9376 3.53609C22.0669 3.85976 22.1294 4.20626 22.1211 4.55471C22.1128 4.90316 22.0339 5.24635 21.8894 5.5635C21.7448 5.88065 21.5375 6.16524 21.2799 6.40005V6.40005Z" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11 4H6C4.93913 4 3.92178 4.42142 3.17163 5.17157C2.42149 5.92172 2 6.93913 2 8V18C2 19.0609 2.42149 20.0783 3.17163 20.8284C3.92178 21.5786 4.93913 22 6 22H17C19.21 22 20 20.2 20 18V13" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
                  Edit
                  </button>
                  <button class="delete-button actionButton actionFlex">
                  <?xml version="1.0" encoding="utf-8"?><!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->
<svg width="15px" height="15px" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="#000000" d="M160 256H96a32 32 0 0 1 0-64h256V95.936a32 32 0 0 1 32-32h256a32 32 0 0 1 32 32V192h256a32 32 0 1 1 0 64h-64v672a32 32 0 0 1-32 32H192a32 32 0 0 1-32-32V256zm448-64v-64H416v64h192zM224 896h576V256H224v640zm192-128a32 32 0 0 1-32-32V416a32 32 0 0 1 64 0v320a32 32 0 0 1-32 32zm192 0a32 32 0 0 1-32-32V416a32 32 0 0 1 64 0v320a32 32 0 0 1-32 32z"/></svg>
                  Delete
                  </button>
                  </div>
              </td>
          `;
          productTable.appendChild(row);
          
          // Add event listeners for buttons
          row.querySelector('.delete-button').addEventListener('click', function () {
            deleteProduct(productoID);
          });
          
          row.querySelector('.edit-button').addEventListener('click', function () {
            editProduct(productoID);
          });
        })
        
        updateSubtotal();

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
      // console.error("Error al obtener los datos de Quotes:", error);
      throw new Error("Currency ID not found. Please verify the currency list and the deal data.", error);
    });
  })
  .catch((err)=>{
    console.log(err)
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

