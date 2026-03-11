/**
 * Custom confirmation dialog for resource-intensive operations
 */
export const showResourceWarningDialog = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      backdrop-filter: blur(2px);
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 2rem;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    `;

    modal.innerHTML = `
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">⚡</div>
        <h3 style="margin: 0; font-size: 1.5rem; color: #333;">Procesamiento Avanzado de Firma</h3>
      </div>
      
      <div style="margin-bottom: 1.5rem; color: #666; line-height: 1.5;">
        <p style="margin-bottom: 1rem;">El procesamiento vectorizado utilizará algoritmos avanzados que:</p>
        <ul style="text-align: left; padding-left: 1.5rem; margin: 0;">
          <li style="margin-bottom: 0.5rem;"><strong>🔧 Recursos:</strong> Consumirá más CPU y memoria</li>
          <li style="margin-bottom: 0.5rem;"><strong>⏱️ Tiempo:</strong> Puede tomar 2-5 segundos adicionales</li>
          <li style="margin-bottom: 0.5rem;"><strong>💻 Rendimiento:</strong> Funciona mejor en dispositivos modernos</li>
          <li style="margin-bottom: 0.5rem;"><strong>✨ Resultado:</strong> Mayor calidad y suavizado profesional</li>
        </ul>
      </div>
      
      <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <p style="margin: 0; font-size: 0.9rem; color: #666;">
          <strong>💡 Alternativa:</strong> Si cancela, se usará el procesamiento "Mejorado" que es más rápido y consume menos recursos.
        </p>
      </div>
      
      <div style="display: flex; gap: 1rem; justify-content: flex-end;">
        <button id="cancel-btn" style="
          padding: 0.75rem 1.5rem;
          border: 2px solid #ddd;
          background: white;
          color: #666;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        ">Usar Mejorado</button>
        <button id="continue-btn" style="
          padding: 0.75rem 1.5rem;
          border: none;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        ">Continuar con Avanzado</button>
      </div>
    `;

    // Add hover effects
    const cancelBtn = modal.querySelector('#cancel-btn') as HTMLButtonElement;
    const continueBtn = modal.querySelector('#continue-btn') as HTMLButtonElement;

    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.borderColor = '#bbb';
      cancelBtn.style.color = '#333';
    });

    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.borderColor = '#ddd';
      cancelBtn.style.color = '#666';
    });

    continueBtn.addEventListener('mouseenter', () => {
      continueBtn.style.transform = 'translateY(-1px)';
      continueBtn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
    });

    continueBtn.addEventListener('mouseleave', () => {
      continueBtn.style.transform = 'translateY(0)';
      continueBtn.style.boxShadow = 'none';
    });

    // Handle clicks
    const cleanup = () => {
      document.body.removeChild(overlay);
      document.body.style.overflow = '';
    };

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    continueBtn.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    // Handle escape key and overlay click
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
        document.removeEventListener('keydown', handleKeydown);
        resolve(false);
      }
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        document.removeEventListener('keydown', handleKeydown);
        resolve(false);
      }
    });

    document.addEventListener('keydown', handleKeydown);

    // Add to DOM
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Focus the continue button
    setTimeout(() => continueBtn.focus(), 100);
  });
};