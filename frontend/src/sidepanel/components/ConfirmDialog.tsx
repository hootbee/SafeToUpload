interface Props {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface Props2 {
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => void;
}

export function ConfirmDialog({ title, description, confirmText, cancelText, onConfirm, onCancel }: Props) {
  const [first, second] = description.split('. ');
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div style={{ 
          height: '4px', 
          width: '40px', 
          background: '#EF4444', 
          margin: '0 auto 20px auto', 
          borderRadius: '2px' 
        }} />
        <h3>{title}</h3>
        <p>{first}.<br/>{second}</p>
        <div className="row-gap">
          <label 
            className="btn" 
            role="button" 
            tabIndex={0} 
            onClick={onCancel}
            onKeyDown={(e) => e.key === 'Enter' && onCancel()}
          >
            {cancelText}
          </label>
          <label 
            className="btn danger" 
            role="button" 
            tabIndex={0} 
            onClick={onConfirm}
            onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
          >
            {confirmText}
          </label>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog2({ title, description, confirmText, onConfirm }: Props2) {
  const infoLines = description.split(' / ');
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div style={{ 
          height: '4px', 
          width: '40px', 
          background: '#EF4444', 
          margin: '0 auto 20px auto', 
          borderRadius: '2px' 
        }} />
        <h3>{title}</h3>
        <div style={{ marginTop: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <div>
            {infoLines.map((line, index) => (
              <p key={index} style={{ margin: '4px 0', fontSize: '15px', color: 'var(--color-text-muted)', textAlign: 'left' }}>
                • {line}
              </p>
            ))}
          </div>
        </div>
        <div className="row-gap">
          <label 
            className="btn danger" 
            role="button" 
            tabIndex={0} 
            onClick={onConfirm}
            onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
          >
            {confirmText}
          </label>
        </div>
      </div>
    </div>
  );
}
