import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Boxes,
  Check,
  ClipboardList,
  Edit3,
  Moon,
  PackagePlus,
  RefreshCw,
  ShoppingCart,
  Sun,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : 'http://localhost:8000';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.detail || 'Request failed');
  }
  return data;
}

const emptyProduct = {
  name: '',
  sku: '',
  description: '',
  price: '',
  stock: '',
};

const emptyCustomer = {
  name: '',
  email: '',
  phone: '',
  address: '',
};

function money(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));
}

function App() {
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [orderCustomerId, setOrderCustomerId] = useState('');
  const [orderLines, setOrderLines] = useState([{ product_id: '', quantity: 1 }]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Theme Management
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextProducts, nextCustomers, nextOrders] = await Promise.all([
        request('/products'),
        request('/customers'),
        request('/orders'),
      ]);
      setProducts(nextProducts);
      setCustomers(nextCustomers);
      setOrders(nextOrders);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const inventoryValue = useMemo(
    () => products.reduce((sum, product) => sum + Number(product.price) * product.stock, 0),
    [products],
  );

  const selectedTotal = useMemo(
    () =>
      orderLines.reduce((sum, line) => {
        const product = products.find((item) => item.id === Number(line.product_id));
        return sum + (product ? Number(product.price) * Number(line.quantity || 0) : 0);
      }, 0),
    [orderLines, products],
  );

  const showNotice = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 3000);
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    setError('');
    const payload = {
      ...productForm,
      price: Number(productForm.price),
      stock: Number(productForm.stock),
    };
    try {
      if (editingProductId) {
        await request(`/products/${editingProductId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showNotice('Product updated.');
      } else {
        await request('/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showNotice('Product added.');
      }
      setProductForm(emptyProduct);
      setEditingProductId(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const editProduct = (product) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
    });
  };

  const deleteProduct = async (id) => {
    setError('');
    try {
      await request(`/products/${id}`, { method: 'DELETE' });
      showNotice('Product deleted.');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const saveCustomer = async (event) => {
    event.preventDefault();
    setError('');
    try {
      if (editingCustomerId) {
        await request(`/customers/${editingCustomerId}`, {
          method: 'PUT',
          body: JSON.stringify(customerForm),
        });
        showNotice('Customer updated.');
      } else {
        await request('/customers', {
          method: 'POST',
          body: JSON.stringify(customerForm),
        });
        showNotice('Customer added.');
      }
      setCustomerForm(emptyCustomer);
      setEditingCustomerId(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const editCustomer = (customer) => {
    setEditingCustomerId(customer.id);
    setCustomerForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      address: customer.address || '',
    });
  };

  const deleteCustomer = async (id) => {
    setError('');
    try {
      await request(`/customers/${id}`, { method: 'DELETE' });
      showNotice('Customer deleted.');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    setError('');
    const payload = {
      customer_id: Number(orderCustomerId),
      items: orderLines
        .filter((line) => line.product_id && Number(line.quantity) > 0)
        .map((line) => ({
          product_id: Number(line.product_id),
          quantity: Number(line.quantity),
        })),
    };
    try {
      await request('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showNotice('Order placed and stock updated.');
      setOrderCustomerId('');
      setOrderLines([{ product_id: '', quantity: 1 }]);
      setTab('orders');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const updateOrderLine = (index, field, value) => {
    setOrderLines((lines) =>
      lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line,
      ),
    );
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Operations Dashboard</p>
          <h1>Inventory & Orders</h1>
        </div>
        <div className="topbar-actions">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            type="button"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button className="secondary icon-text" onClick={loadData} type="button" title="Refresh data">
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </header>

      <section className="metrics">
        <Metric icon={<Boxes />} label="Products" value={products.length} />
        <Metric icon={<Users />} label="Customers" value={customers.length} />
        <Metric icon={<ClipboardList />} label="Orders" value={orders.length} />
        <Metric icon={<ShoppingCart />} label="Inventory value" value={money(inventoryValue)} />
      </section>

      <nav className="tabs" aria-label="Sections">
        <TabButton active={tab === 'products'} icon={<Boxes />} onClick={() => setTab('products')}>
          Products
        </TabButton>
        <TabButton active={tab === 'customers'} icon={<Users />} onClick={() => setTab('customers')}>
          Customers
        </TabButton>
        <TabButton active={tab === 'orders'} icon={<ClipboardList />} onClick={() => setTab('orders')}>
          Orders
        </TabButton>
      </nav>

      {notice && <div className="notice success">{notice}</div>}
      {error && <div className="notice error">{error}</div>}
      {loading && <div className="notice muted">Loading...</div>}

      {tab === 'products' && (
        <section className="workspace two-column">
          <form className="panel form-panel" onSubmit={saveProduct}>
            <div className="panel-title">
              <PackagePlus size={20} />
              <h2>{editingProductId ? 'Edit product' : 'Add product'}</h2>
            </div>
            <label>
              Name
              <input
                required
                value={productForm.name}
                onChange={(event) => setProductForm({ ...productForm, name: event.target.value })}
              />
            </label>
            <label>
              SKU
              <input
                required
                value={productForm.sku}
                onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })}
              />
            </label>
            <label>
              Description
              <textarea
                value={productForm.description}
                onChange={(event) =>
                  setProductForm({ ...productForm, description: event.target.value })
                }
              />
            </label>
            <div className="field-grid">
              <label>
                Price
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={productForm.price}
                  onChange={(event) =>
                    setProductForm({ ...productForm, price: event.target.value })
                  }
                />
              </label>
              <label>
                Stock
                <input
                  required
                  min="0"
                  step="1"
                  type="number"
                  value={productForm.stock}
                  onChange={(event) =>
                    setProductForm({ ...productForm, stock: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="button-row">
              <button className="primary" type="submit">
                <Check size={18} />
                {editingProductId ? 'Save' : 'Create'}
              </button>
              {editingProductId && (
                <button
                  className="secondary"
                  type="button"
                  onClick={() => {
                    setEditingProductId(null);
                    setProductForm(emptyProduct);
                  }}
                >
                  <X size={18} />
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="panel">
            <div className="panel-title">
              <Boxes size={20} />
              <h2>Products</h2>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.name}</strong>
                        <span>{product.description}</span>
                      </td>
                      <td>{product.sku}</td>
                      <td>{money(product.price)}</td>
                      <td>
                        <span className={product.stock === 0 ? 'pill alert' : product.stock < 5 ? 'pill alert' : 'pill success'}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="actions">
                        <button type="button" onClick={() => editProduct(product)} title="Edit product">
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="delete-btn"
                          type="button"
                          onClick={() => deleteProduct(product.id)}
                          title="Delete product"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {tab === 'customers' && (
        <section className="workspace two-column">
          <form className="panel form-panel" onSubmit={saveCustomer}>
            <div className="panel-title">
              <UserPlus size={20} />
              <h2>{editingCustomerId ? 'Edit customer' : 'Add customer'}</h2>
            </div>
            <label>
              Name
              <input
                required
                value={customerForm.name}
                onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })}
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={customerForm.email}
                onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })}
              />
            </label>
            <label>
              Phone
              <input
                value={customerForm.phone}
                onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })}
              />
            </label>
            <label>
              Address
              <textarea
                value={customerForm.address}
                onChange={(event) =>
                  setCustomerForm({ ...customerForm, address: event.target.value })
                }
              />
            </label>
            <div className="button-row">
              <button className="primary" type="submit">
                <Check size={18} />
                {editingCustomerId ? 'Save' : 'Create'}
              </button>
              {editingCustomerId && (
                <button
                  className="secondary"
                  type="button"
                  onClick={() => {
                    setEditingCustomerId(null);
                    setCustomerForm(emptyCustomer);
                  }}
                >
                  <X size={18} />
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="panel">
            <div className="panel-title">
              <Users size={20} />
              <h2>Customers</h2>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <strong>{customer.name}</strong>
                        <span>{customer.address}</span>
                      </td>
                      <td>{customer.email}</td>
                      <td>{customer.phone}</td>
                      <td className="actions">
                        <button
                          type="button"
                          onClick={() => editCustomer(customer)}
                          title="Edit customer"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="delete-btn"
                          type="button"
                          onClick={() => deleteCustomer(customer.id)}
                          title="Delete customer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {tab === 'orders' && (
        <section className="workspace two-column order-layout">
          <form className="panel form-panel" onSubmit={submitOrder}>
            <div className="panel-title">
              <ShoppingCart size={20} />
              <h2>New order</h2>
            </div>
            <label>
              Customer
              <select
                required
                value={orderCustomerId}
                onChange={(event) => setOrderCustomerId(event.target.value)}
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.email})
                  </option>
                ))}
              </select>
            </label>
            <div className="line-items">
              {orderLines.map((line, index) => {
                const product = products.find((item) => item.id === Number(line.product_id));
                const overStock = product && Number(line.quantity) > product.stock;
                return (
                  <div className="order-line" key={`${index}-${line.product_id}`}>
                    <label>
                      Product
                      <select
                        required
                        value={line.product_id}
                        onChange={(event) => updateOrderLine(index, 'product_id', event.target.value)}
                      >
                        <option value="">Select product</option>
                        {products.map((productItem) => (
                          <option key={productItem.id} value={productItem.id}>
                            {productItem.name} - {productItem.stock} available
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Qty
                      <input
                        required
                        min="1"
                        step="1"
                        type="number"
                        value={line.quantity}
                        onChange={(event) => updateOrderLine(index, 'quantity', event.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      title="Remove line"
                      onClick={() =>
                        setOrderLines((lines) => lines.filter((_, lineIndex) => lineIndex !== index))
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                    {overStock && <p className="line-warning">Insufficient stock</p>}
                  </div>
                );
              })}
            </div>
            <button
              className="secondary"
              type="button"
              onClick={() => setOrderLines([...orderLines, { product_id: '', quantity: 1 }])}
            >
              <PackagePlus size={18} />
              Add line
            </button>
            <div className="order-total">
              <span>Total</span>
              <strong>{money(selectedTotal)}</strong>
            </div>
            <button className="primary" type="submit">
              <Check size={18} />
              Place order
            </button>
          </form>

          <div className="panel">
            <div className="panel-title">
              <ClipboardList size={20} />
              <h2>Orders</h2>
            </div>
            <div className="order-list">
              {orders.map((order) => (
                <article className="order-card" key={order.id}>
                  <div className="order-card-header">
                    <strong>Order #{order.id}</strong>
                    <span>{new Date(order.created_at).toLocaleString()}</span>
                  </div>
                  <div className="order-card-customer">
                    <strong>{order.customer.name}</strong>
                    <span>{order.customer.email}</span>
                  </div>
                  <ul className="order-card-items">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.product.name} x {item.quantity}
                        <span>{money(Number(item.unit_price) * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="order-card-footer">
                    <span className={order.status === 'placed' ? 'pill success' : 'pill'}>
                      {order.status}
                    </span>
                    <strong>{money(order.total_amount)}</strong>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function Metric({ icon, label, value }) {
  return (
    <article className="metric">
      <div className="metric-icon-wrap">
        {React.cloneElement(icon, { size: 22 })}
      </div>
      <div className="metric-info">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function TabButton({ active, children, icon, onClick }) {
  return (
    <button className={active ? 'active' : ''} onClick={onClick} type="button">
      {React.cloneElement(icon, { size: 18 })}
      {children}
    </button>
  );
}

createRoot(document.getElementById('root')).render(<App />);
