import React, { useState } from 'react';
import { Users, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { createStudyGroup } from '../../services/firestoreService';
import { UserProfile } from '../../types';
import { SUBJECT_CATALOG } from '../../utils/matching';
import { Avatar } from '../common/Avatar';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: UserProfile[];
  onCreated?: (groupId: string) => void;
}

export function CreateGroupModal({ isOpen, onClose, partners, onCreated }: CreateGroupModalProps) {
  const { userProfile } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState(userProfile?.subjects?.[0] || SUBJECT_CATALOG[0]);
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPublicGroup, setIsPublicGroup] = useState(true);
  const [saving, setSaving] = useState(false);

  if (!isOpen || !userProfile) return null;

  const toggleMember = (uid: string) => {
    setSelectedIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter a group name', 'error');
      return;
    }
    setSaving(true);
    try {
      const id = await createStudyGroup({
        name: name.trim(),
        subject,
        description: description.trim() || `Collaborative ${subject} study group`,
        creatorId: userProfile.uid,
        memberIds: selectedIds,
        isPublicGroup,
      });
      showToast('Study group created', 'success');
      setName('');
      setDescription('');
      setSelectedIds([]);
      onClose();
      if (onCreated) onCreated(id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create group', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="group-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 id="group-modal-title" className="font-display text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Create Study Group
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Group name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Linear Algebra Finals Prep"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Primary subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {SUBJECT_CATALOG.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Description & goals</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Weekly problem-set reviews and mock exams..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Add initial members</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              {partners.slice(0, 12).map((p) => {
                const active = selectedIds.includes(p.uid);
                return (
                  <button
                    key={p.uid}
                    type="button"
                    onClick={() => toggleMember(p.uid)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      active
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <Avatar src={p.avatarUrl} name={p.fullName} size="sm" />
                    <span>{p.fullName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublicGroup}
              onChange={(e) => setIsPublicGroup(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Allow other StudyMate students to discover and join this group
          </label>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
