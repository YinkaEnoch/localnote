import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderRepository } from '@/database/repositories/FolderRepository';
import type { FolderWithCount } from '@/types/models';

interface SelectFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderId: string | null) => void;
  currentFolderId?: string | null;
}

export function SelectFolderModal({ isOpen, onClose, onSelect, currentFolderId }: SelectFolderModalProps) {
  const navigate = useNavigate();
  const [folders, setFolders] = useState<FolderWithCount[]>([]);

  useEffect(() => {
    if (isOpen) {
      FolderRepository.getAll().then(setFolders).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Scrim / Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 transition-opacity duration-300"
        onClick={onClose}
      />
      {/* Bottom Sheet */}
      <div className="relative z-10 w-full max-w-[800px] mx-auto bg-surface rounded-t-xl sm:rounded-t-3xl shadow-[0_-8px_24px_rgba(0,0,0,0.4)] flex flex-col pt-sm pb-safe h-[80vh] sm:h-auto sm:max-h-[85vh]">
        {/* Drag Handle Area */}
        <div className="w-full py-sm flex justify-center cursor-pointer" onClick={onClose}>
          <div className="w-8 h-1 rounded-full bg-on-surface-variant/40" />
        </div>

        {/* Header */}
        <div className="px-margin-mobile sm:px-margin-desktop pb-md flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md text-on-surface">Move to</h2>
          <button 
            aria-label="Close" 
            className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-margin-mobile sm:px-margin-desktop pb-xl">
          {/* Actions */}
          <div className="mb-lg">
            <button 
              className="w-full flex items-center gap-md py-sm px-md rounded-lg hover:bg-surface-container transition-colors group text-primary"
              onClick={() => {
                onClose();
                navigate('/folder/new');
              }}
            >
              <span className="material-symbols-outlined">create_new_folder</span>
              <span className="font-body-md text-body-md font-medium">New Folder</span>
            </button>
          </div>

          {/* List */}
          <div className="flex flex-col gap-xs">
            {/* Uncategorized Item */}
            <button 
              className={`w-full flex items-center gap-md py-sm px-md rounded-lg transition-colors group text-on-surface ${
                !currentFolderId ? 'bg-surface-container-high border-l-2 border-primary' : 'hover:bg-surface-container'
              }`}
              onClick={() => onSelect(null)}
            >
              <span className="material-symbols-outlined text-on-surface-variant">folder_off</span>
              <span className="font-body-md text-body-md flex-1 text-left">None (Uncategorized)</span>
              {!currentFolderId && (
                <span className="material-symbols-outlined text-primary text-[20px]">check</span>
              )}
            </button>

            <div className="h-px bg-surface-container-high my-sm mx-md" />

            {/* Existing Folders */}
            {folders.map(folder => {
              const isSelected = currentFolderId === folder.id;
              return (
                <button
                  key={folder.id}
                  className={`w-full flex items-center gap-md py-sm px-md rounded-lg transition-colors group text-on-surface ${
                    isSelected ? 'bg-surface-container-high border-l-2 border-primary' : 'hover:bg-surface-container'
                  }`}
                  onClick={() => onSelect(folder.id)}
                >
                  <span 
                    className="material-symbols-outlined" 
                    style={{ color: `var(--color-${folder.color})`, fontVariationSettings: "'FILL' 1" }}
                  >
                    folder
                  </span>
                  <div className="flex-1 text-left flex flex-col">
                    <span className="font-body-md text-body-md">{folder.name}</span>
                  </div>
                  {isSelected ? (
                    <span className="material-symbols-outlined text-primary text-[20px]">check</span>
                  ) : (
                    <span className="font-label-sm text-label-sm text-on-surface-variant opacity-60 group-hover:opacity-100 transition-opacity">
                      {folder.itemCount} {folder.itemCount === 1 ? 'item' : 'items'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
