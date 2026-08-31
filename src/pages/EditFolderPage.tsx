import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FolderRepository } from '@/database/repositories/FolderRepository';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import type { FolderColor } from '@/types/models';
import './EditFolderPage.css';

const colorMapping: Record<FolderColor, { bg: string, onBg: string }> = {
  purple: { bg: 'var(--color-primary)', onBg: 'var(--color-on-primary)' },
  coral: { bg: 'var(--color-tertiary-container)', onBg: 'var(--color-on-tertiary-container)' },
  amber: { bg: 'var(--color-tertiary)', onBg: 'var(--color-on-tertiary)' },
  teal: { bg: 'var(--color-secondary-container)', onBg: 'var(--color-on-secondary-container)' },
  lavender: { bg: 'var(--color-primary-container)', onBg: 'var(--color-on-primary-container)' },
  blue: { bg: 'var(--color-inverse-primary)', onBg: 'var(--color-primary-container)' },
};

const FOLDER_COLORS: FolderColor[] = ['purple', 'coral', 'amber', 'teal', 'lavender', 'blue'];

export function EditFolderPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState<FolderColor>('purple');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      FolderRepository.getById(id).then(folder => {
        if (folder) {
          setName(folder.name);
          setSelectedColor(folder.color);
        }
      });
    }
  }, [id, isNew]);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (isNew) {
      await FolderRepository.create({ name: name.trim(), color: selectedColor });
    } else if (id) {
      await FolderRepository.update(id, { name: name.trim(), color: selectedColor });
    }
    navigate(-1);
  };

  const handleDelete = async () => {
    if (id) {
      await FolderRepository.remove(id);
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="edit-folder-page">
      <header className="efp-header-bar">
        <button className="efp-icon-btn" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="efp-header-title">
          {isNew ? 'New Folder' : 'Edit Folder'}
        </div>
        <button className="efp-icon-btn primary" onClick={handleSave} disabled={!name.trim()}>
          <span className="material-symbols-outlined">check</span>
        </button>
      </header>

      <main className="efp-main">
        <section className="efp-section">
          <label className="efp-label" htmlFor="folder-name">Folder Name</label>
          <input
            id="folder-name"
            type="text"
            className="efp-input"
            placeholder="Name this folder"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </section>

        <section className="efp-section">
          <div className="efp-label">Theme Color</div>
          <div className="efp-color-grid">
            {FOLDER_COLORS.map(color => (
              <button
                key={color}
                className={`efp-color-swatch ${selectedColor === color ? 'selected' : ''}`}
                style={{ backgroundColor: colorMapping[color].bg }}
                onClick={() => setSelectedColor(color)}
                aria-label={`Select ${color}`}
              >
                {selectedColor === color && (
                  <span className="material-symbols-outlined icon" style={{ color: colorMapping[color].onBg }}>
                    check
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        <div className="efp-spacer" />

        {!isNew && (
          <section>
            <button className="efp-delete-btn text-base" onClick={() => setConfirmDeleteOpen(true)}>
              <span className="material-symbols-outlined">delete</span>
              Delete Folder
            </button>
          </section>
        )}
      </main>

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Delete Folder?"
        message="Items in this folder will be uncategorized. This action cannot be undone."
        confirmText="Delete"
        destructive
        onConfirm={() => {
          setConfirmDeleteOpen(false);
          handleDelete();
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
