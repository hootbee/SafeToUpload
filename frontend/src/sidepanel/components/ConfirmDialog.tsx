interface Props {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
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
