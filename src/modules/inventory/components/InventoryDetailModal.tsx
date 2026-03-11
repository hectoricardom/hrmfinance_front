import { Component } from 'solid-js';
import { useTranslation } from '../../../translations';
import { Modal } from '../../ui';
import { Button } from '../../ui';
import { InventoryItem } from '../stores/inventoryStore';
import { devLog } from '../../../services/utils';

interface InventoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}

const InventoryDetailModal: Component<InventoryDetailModalProps> = (props) => {
  const { t } = useTranslation();
  const detailRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem 0',
    'border-bottom': '1px solid var(--border-color)'
  };

  const labelStyle = {
    'font-weight': '500',
    color: 'var(--text-muted)',
    'font-size': '0.875rem'
  };

  const valueStyle = {
    'font-weight': '600',
    color: 'var(--text-primary)'
  };

  const headerStyle = {
    'text-align': 'center',
    'margin-bottom': '2rem'
  };

  const nameStyle = {
    'font-size': '1.5rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    margin: '0.5rem 0'
  };

  const categoryStyle = {
    color: 'var(--text-muted)',
    'font-size': '1rem'
  };

  const priceStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--primary-color)',
    'margin-bottom': '1rem'
  };

  const stockLevelStyle = (quantity: number, minStock: number) => ({
    padding: '0.25rem 0.75rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    'text-transform': 'uppercase',
    'letter-spacing': '0.5px',
    background: quantity > minStock ? '#d4edda' : '#f8d7da',
    color: quantity > minStock ? '#155724' : '#721c24'
  });

  const buttonGroupStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end',
    'margin-top': '2rem'
  };

  const descriptionStyle = {
    'margin-bottom': '1.5rem',
    padding: '1rem',
    background: 'var(--background-color)',
    'border-radius': 'var(--border-radius-sm)',
    color: 'var(--text-secondary)'
  };

  if (!props.item) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const totalValue = props.item.price * props.item.quantity;

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title={t('inventory.itemDetails')}>
      <div style={headerStyle}>
        <div style={nameStyle}>{props.item.name}</div>
        <div style={categoryStyle}>{props.item.category}</div>
        <div style={priceStyle}>{formatPrice(props.item.price)}</div>
        <div style={stockLevelStyle(props.item.quantity, props.item.minStock)}>
          {props.item.quantity > props.item.minStock ? t('inventory.inStock') : t('inventory.lowStockAlert')}
        </div>
      </div>

      <div style={descriptionStyle}>
        <strong>{t('common.description')}:</strong> {props.item.description}
      </div>

      <div>
        <div style={detailRowStyle}>
          <span style={labelStyle}>{t('inventory.sku')}</span>
          <span style={valueStyle}>{props.item.sku}</span>
        </div>
        <div style={detailRowStyle}>
          <span style={labelStyle}>{t('inventory.quantity')}</span>
          <span style={valueStyle}>{props.item.quantity} {t('common.units')}</span>
        </div>
        <div style={detailRowStyle}>
          <span style={labelStyle}>{t('inventory.minimumStock')}</span>
          <span style={valueStyle}>{props.item.minStock} {t('common.units')}</span>
        </div>
        <div style={detailRowStyle}>
          <span style={labelStyle}>{t('inventory.totalValue')}</span>
          <span style={valueStyle}>{formatPrice(totalValue)}</span>
        </div>
        <div style={detailRowStyle}>
          <span style={labelStyle}>{t('inventory.supplier')}</span>
          <span style={valueStyle}>{props.item.supplier}</span>
        </div>
        <div style={detailRowStyle}>
          <span style={labelStyle}>{t('inventory.location')}</span>
          <span style={valueStyle}>{props.item.location}</span>
        </div>
        <div style={detailRowStyle}>
          <span style={labelStyle}>{t('common.lastUpdated')}</span>
          <span style={valueStyle}>{formatDate(props.item.lastUpdated)}</span>
        </div>
      </div>

      <div style={buttonGroupStyle}>
        <Button variant="secondary" onClick={props.onClose}>
          {t('common.close')}
        </Button>
        <Button variant="primary" onClick={() => {
          // TODO: Implement edit functionality
          devLog('Edit item:', props.item.id);
        }}>
          {t('common.editItem')}
        </Button>
      </div>
    </Modal>
  );
};

export default InventoryDetailModal;