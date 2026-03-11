/**
 * ProductImageManager Component
 * Handles AI-powered image search and image management for products
 */

import { Component, createSignal, createEffect, For, Show } from 'solid-js';
import { useTranslation } from '../../../translations';
import { Button } from '../../ui';
import { Product } from '../stores/inventoryStore';
import {
  ProductImage,
  AIImageSearchResult,
  findProductImageWithAI,
  searchProductImagesMultiStrategy,
  getProductImages,
  addProductImage,
  setProductPrimaryImage,
  deleteProductImage
} from '../services/productImageService';
import { devLog } from '../../../services/utils';

interface ProductImageManagerProps {
  product: Product;
  onImageChange?: (imageUrl: string) => void;
}

const ProductImageManager: Component<ProductImageManagerProps> = (props) => {
  const { t } = useTranslation();

  // State
  const [existingImages, setExistingImages] = createSignal<ProductImage[]>([]);
  const [searchResults, setSearchResults] = createSignal<AIImageSearchResult[]>([]);
  const [isSearching, setIsSearching] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
  const [selectedImage, setSelectedImage] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null);
  const [manualUrl, setManualUrl] = createSignal('');

  // Load existing images on mount
  createEffect(async () => {
    if (props.product?.id) {
      await loadExistingImages();
    }
  });

  const loadExistingImages = async () => {
    setIsLoading(true);
    try {
      const images = await getProductImages(props.product.id);
      setExistingImages(images);
    } catch (err) {
      console.error('Error loading images:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Search for images using AI multi-strategy
  const handleAISearch = async () => {
    setIsSearching(true);
    setError(null);
    setSearchResults([]);

    try {
      devLog(`Searching images for: ${props.product.name}`);

      const results = await searchProductImagesMultiStrategy(
        props.product.id,
        props.product.name,
        props.product.description,
        props.product.category,
        props.product.UPC
      );

      setSearchResults(results);

      if (results.length === 0) {
        setError(t('inventory.noImagesFound', 'No se encontraron imágenes para este producto'));
      } else {
        setSuccessMessage(`${results.length} ${t('inventory.imagesFound', 'imágenes encontradas')}`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error searching images:', err);
      setError(t('inventory.imageSearchError', 'Error al buscar imágenes'));
    } finally {
      setIsSearching(false);
    }
  };

  // Add selected image to product
  const handleAddImage = async (imageUrl: string, source: 'ai' | 'manual' = 'ai') => {
    setIsLoading(true);
    setError(null);

    try {
      const isPrimary = existingImages().length === 0; // First image is primary
      const newImage = await addProductImage(
        props.product.id,
        imageUrl,
        source,
        isPrimary
      );

      if (newImage) {
        setExistingImages([...existingImages(), newImage]);
        setSuccessMessage(t('inventory.imageAdded', 'Imagen agregada correctamente'));
        setTimeout(() => setSuccessMessage(null), 3000);

        // Notify parent of change
        if (isPrimary) {
          props.onImageChange?.(imageUrl);
        }

        // Remove from search results
        setSearchResults(searchResults().filter(r => r.imageUrl !== imageUrl));
      }
    } catch (err) {
      console.error('Error adding image:', err);
      setError(t('inventory.imageAddError', 'Error al agregar imagen'));
    } finally {
      setIsLoading(false);
    }
  };

  // Add manual URL image
  const handleAddManualUrl = async () => {
    if (!manualUrl().trim()) return;

    await handleAddImage(manualUrl().trim(), 'manual');
    setManualUrl('');
  };

  // Set image as primary
  const handleSetPrimary = async (imageId: string, imageUrl: string) => {
    setIsLoading(true);
    try {
      const success = await setProductPrimaryImage(props.product.id, imageId);
      if (success) {
        // Update local state
        setExistingImages(existingImages().map(img => ({
          ...img,
          isPrimary: img.id === imageId
        })));
        props.onImageChange?.(imageUrl);
        setSuccessMessage(t('inventory.primaryImageSet', 'Imagen principal establecida'));
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error setting primary image:', err);
      setError(t('inventory.primaryImageError', 'Error al establecer imagen principal'));
    } finally {
      setIsLoading(false);
    }
  };

  // Delete image
  const handleDeleteImage = async (imageId: string) => {
    if (!confirm(t('inventory.confirmDeleteImage', '¿Está seguro de eliminar esta imagen?'))) {
      return;
    }

    setIsLoading(true);
    try {
      const success = await deleteProductImage(props.product.id, imageId);
      if (success) {
        setExistingImages(existingImages().filter(img => img.id !== imageId));
        setSuccessMessage(t('inventory.imageDeleted', 'Imagen eliminada'));
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error deleting image:', err);
      setError(t('inventory.imageDeleteError', 'Error al eliminar imagen'));
    } finally {
      setIsLoading(false);
    }
  };

  // Styles
  const containerStyle = {
    padding: '1rem 0'
  };

  const sectionStyle = {
    'margin-bottom': '2rem'
  };

  const sectionTitleStyle = {
    'font-size': '1rem',
    'font-weight': '600',
    'margin-bottom': '1rem',
    color: 'var(--text-primary)'
  };

  const imageGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '1rem'
  };

  const imageCardStyle = (isSelected: boolean, isPrimary: boolean) => ({
    position: 'relative' as const,
    'border-radius': 'var(--border-radius-sm)',
    overflow: 'hidden',
    border: isPrimary
      ? '3px solid var(--primary-color)'
      : isSelected
        ? '3px solid #4ade80'
        : '1px solid var(--border-color)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: 'var(--surface-color)'
  });

  const imageStyle = {
    width: '100%',
    height: '120px',
    'object-fit': 'cover' as const,
    display: 'block'
  };

  const imageBadgeStyle = (type: 'primary' | 'ai' | 'manual') => ({
    position: 'absolute' as const,
    top: '0.25rem',
    left: '0.25rem',
    padding: '0.15rem 0.5rem',
    'border-radius': '9999px',
    'font-size': '0.65rem',
    'font-weight': '600',
    background: type === 'primary' ? 'var(--primary-color)' : type === 'ai' ? '#8b5cf6' : '#6b7280',
    color: 'white'
  });

  const imageActionsStyle = {
    position: 'absolute' as const,
    bottom: '0',
    left: '0',
    right: '0',
    background: 'rgba(0,0,0,0.7)',
    padding: '0.5rem',
    display: 'flex',
    gap: '0.25rem',
    'justify-content': 'center'
  };

  const actionButtonStyle = {
    padding: '0.25rem 0.5rem',
    'font-size': '0.7rem',
    'border-radius': '4px',
    border: 'none',
    cursor: 'pointer',
    color: 'white'
  };

  const searchBoxStyle = {
    display: 'flex',
    gap: '1rem',
    'margin-bottom': '1rem',
    'flex-wrap': 'wrap' as const
  };

  const inputStyle = {
    flex: '1',
    'min-width': '200px',
    padding: '0.75rem 1rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    background: 'var(--surface-color)',
    color: 'var(--text-primary)'
  };

  const messageStyle = (type: 'error' | 'success') => ({
    padding: '0.75rem 1rem',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '1rem',
    background: type === 'error' ? '#fef2f2' : '#f0fdf4',
    border: `1px solid ${type === 'error' ? '#fecaca' : '#bbf7d0'}`,
    color: type === 'error' ? '#dc2626' : '#16a34a'
  });

  const emptyStateStyle = {
    'text-align': 'center' as const,
    padding: '2rem',
    color: 'var(--text-muted)',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px dashed var(--border-color)'
  };

  return (
    <div style={containerStyle}>
      {/* Error/Success Messages */}
      <Show when={error()}>
        <div style={messageStyle('error')}>
          {error()}
        </div>
      </Show>
      <Show when={successMessage()}>
        <div style={messageStyle('success')}>
          {successMessage()}
        </div>
      </Show>

      {/* Current Product Images */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>
          {t('inventory.currentImages', 'Imágenes Actuales')}
          <Show when={existingImages().length > 0}>
            <span style={{ 'font-weight': '400', color: 'var(--text-muted)', 'margin-left': '0.5rem' }}>
              ({existingImages().length})
            </span>
          </Show>
        </h4>

        <Show
          when={existingImages().length > 0}
          fallback={
            <div style={emptyStateStyle}>
              <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>📷</div>
              <div>{t('inventory.noImagesYet', 'Este producto no tiene imágenes')}</div>
              <div style={{ 'font-size': '0.875rem', 'margin-top': '0.5rem' }}>
                {t('inventory.useAISearch', 'Use la búsqueda AI para encontrar imágenes')}
              </div>
            </div>
          }
        >
          <div style={imageGridStyle}>
            <For each={existingImages()}>
              {(image) => (
                <div
                  style={imageCardStyle(selectedImage() === image.id, image.isPrimary)}
                  onClick={() => setSelectedImage(selectedImage() === image.id ? null : image.id)}
                >
                 
                  <img
                    src={image.url}
                    alt={props.product.name}
                    style={imageStyle}
                    loading="lazy"
                  />
                  <Show when={image.isPrimary}>
                    <span style={imageBadgeStyle('primary')}>Principal</span>
                  </Show>
                  <Show when={!image.isPrimary && image.source === 'ai'}>
                    <span style={imageBadgeStyle('ai')}>AI</span>
                  </Show>

                  {/* Action buttons on hover/select */}
                  <Show when={selectedImage() === image.id}>
                    <div style={imageActionsStyle}>
                      <Show when={!image.isPrimary}>
                        <button
                          style={{ ...actionButtonStyle, background: 'var(--primary-color)' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetPrimary(image.id, image.imageUrl);
                          }}
                        >
                          Principal
                        </button>
                      </Show>
                      <button
                        style={{ ...actionButtonStyle, background: '#dc2626' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(image.id);
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* AI Image Search */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>
          {t('inventory.findImagesAI', 'Buscar Imágenes con AI')}
        </h4>

        <div style={searchBoxStyle}>
          <Button
            variant="primary"
            onClick={handleAISearch}
            disabled={isSearching()}
          >
            {isSearching() ? (
              <>Buscando...</>
            ) : (
              <>🤖 {t('inventory.searchWithAI', 'Buscar con AI')}</>
            )}
          </Button>

          <div style={{ display: 'flex', gap: '0.5rem', flex: '1', 'min-width': '250px' }}>
            <input
              type="text"
              placeholder={t('inventory.pasteImageUrl', 'Pegar URL de imagen...')}
              value={manualUrl()}
              onInput={(e) => setManualUrl(e.currentTarget.value)}
              style={inputStyle}
            />
            <Button
              variant="secondary"
              onClick={handleAddManualUrl}
              disabled={!manualUrl().trim() || isLoading()}
            >
              Agregar
            </Button>
          </div>
        </div>

        {/* Search info */}
        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '1rem' }}>
          {t('inventory.aiSearchInfo', 'La búsqueda AI analiza el nombre, descripción, categoría y UPC del producto para encontrar imágenes relevantes.')}
        </div>

        {/* Search Results */}
        <Show when={searchResults().length > 0}>
          <div style={{ 'margin-top': '1rem' }}>
            <h5 style={{ 'font-size': '0.875rem', 'margin-bottom': '0.75rem', color: 'var(--text-muted)' }}>
              {t('inventory.searchResults', 'Resultados de Búsqueda')} ({searchResults().length})
            </h5>
            <div style={imageGridStyle}>
              <For each={searchResults()}>
                {(result) => (
                  <div
                    style={{
                      ...imageCardStyle(false, false),
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <img
                      src={result.thumbnailUrl || result.imageUrl}
                      alt={result.title}
                      style={imageStyle}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150x120?text=Error';
                      }}
                    />
                    <div style={{
                      padding: '0.5rem',
                      'font-size': '0.7rem',
                      color: 'var(--text-muted)',
                      overflow: 'hidden',
                      'text-overflow': 'ellipsis',
                      'white-space': 'nowrap' as const
                    }}>
                      {result.title || result.source}
                    </div>
                    <div style={{
                      ...imageActionsStyle,
                      background: 'rgba(0,0,0,0.8)'
                    }}>
                      <button
                        style={{ ...actionButtonStyle, background: '#22c55e', flex: '1' }}
                        onClick={() => handleAddImage(result.imageUrl, 'ai')}
                        disabled={isLoading()}
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Loading indicator */}
        <Show when={isSearching()}>
          <div style={{ 'text-align': 'center', padding: '2rem' }}>
            <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>🔍</div>
            <div>{t('inventory.searchingImages', 'Buscando imágenes con AI...')}</div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.5rem' }}>
              {t('inventory.multiStrategySearch', 'Ejecutando múltiples estrategias de búsqueda')}
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default ProductImageManager;
