import { useState } from 'react';
import { Card, Table, Badge, Button, Form } from 'react-bootstrap';
import { FaBoxes, FaTrash } from 'react-icons/fa';
import { useToast } from '../../../context/ToastContext';


/* ═══════════════ TAB 2 – MEDICINE MANAGEMENT ═════════════════ */
export default function MedicinesTab({ medicines, setMedicines }) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  const visible = medicines.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  const handlePriceChange = (id, newPrice) => {
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, price: Number(newPrice) } : m));
  };

  const handleStockChange = (id, newStock) => {
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, stock: Number(newStock) } : m));
  };

  const handleRemove = (id) => {
    if (!window.confirm('Remove this medicine from catalog?')) return;
    setMedicines(prev => prev.filter(m => m.id !== id));
    toast.success('Medicine removed from public catalog listings');
  };

  return (
    <>
      <div className="adm-section-toolbar mb-3">
        <h5 className="adm-section-title"><FaBoxes className="me-2 text-primary" />Medicine Inventory Pricing & Stock Control</h5>
      </div>

      <div className="adm-toolbar mb-3">
        <div className="adm-search-wrap" style={{ flex: 1 }}>
          <input className="adm-search w-100" placeholder="Search medicines by name or therapeutic class..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="adm-table-card border-0 shadow-sm">
        <div className="adm-table-wrap">
          <Table hover className="adm-table">
            <thead>
              <tr><th>#</th><th>Medicine Name</th><th>Category</th><th>Price (Rs.)</th><th>Current Stock</th><th>Availability</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {visible.length === 0 && <tr><td colSpan={7} className="text-center py-4">No medicines match search.</td></tr>}
              {visible.map((m, idx) => (
                <tr key={m.id} className={m.stock === 0 ? 'row-danger' : m.stock < 10 ? 'row-warn' : ''}>
                  <td className="text-muted small">{idx + 1}</td>
                  <td className="fw-bold">{m.name}</td>
                  <td><Badge bg="secondary" className="cat-badge">{m.category}</Badge></td>
                  <td>
                    <Form.Control type="number" size="sm" className="adm-inline-input" value={m.price} onChange={e => handlePriceChange(m.id, e.target.value)} />
                  </td>
                  <td>
                    <Form.Control type="number" size="sm" className="adm-inline-input" value={m.stock} onChange={e => handleStockChange(m.id, e.target.value)} />
                  </td>
                  <td>
                    {m.stock === 0 ? (
                      <Badge bg="danger">Out of Stock</Badge>
                    ) : m.stock < 10 ? (
                      <Badge bg="warning" text="dark">Low Stock</Badge>
                    ) : (
                      <Badge bg="success">In Stock</Badge>
                    )}
                  </td>
                  <td>
                    <Button size="sm" variant="outline-danger" onClick={() => handleRemove(m.id)}>
                      <FaTrash /> Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </>
  );
}
