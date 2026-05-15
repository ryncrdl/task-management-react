import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { laravelApi, getErrorMessage } from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../hooks/useSocket';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

const STATUS_TRANSITIONS = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'pending'],
  completed: [],
  cancelled: [],
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const PRIORITY_COLORS = {
  low: 'text-gray-500', medium: 'text-orange-500', high: 'text-red-600',
};

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isManager } = useAuth();
  const { addToast } = useToast();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Comments
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionAnchor, setMentionAnchor] = useState(null);
  const [activeMention, setActiveMention] = useState(null); // { member, rect }
  const commentsEndRef = useRef(null);
  const textareaRef = useRef(null);
  const mentionCardRef = useRef(null);

  // Close mention card on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (mentionCardRef.current && !mentionCardRef.current.contains(e.target)) {
        setActiveMention(null);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const COLLAPSE_THRESHOLD = 200;

  const mentionMatches = useCallback(() => {
    // Exclude the current user from mention suggestions
    const others = teamMembers.filter((m) => m.id !== user?.id);
    if (!mentionQuery) return others;
    return others.filter((m) =>
      m.name.toLowerCase().includes(mentionQuery.toLowerCase())
    );
  }, [mentionQuery, teamMembers, user?.id]);

  // Real-time updates via Socket.io
  useSocket(
    {
      'task:updated': (data) => {
        if (String(data.task_id) === String(id)) { addToast('Task updated in real-time.', 'info'); loadTask(); }
      },
      'task:status_changed': (data) => {
        if (String(data.task_id) === String(id)) loadTask();
      },
      'task:deleted': (data) => {
        if (String(data.task_id) === String(id)) {
          addToast('This task was deleted.', 'warning');
          navigate('/tasks');
        }
      },
      'comment:created': (data) => {
        if (String(data.task_id) === String(id)) {
          setComments((prev) =>
            prev.some((c) => c.id === data.comment?.id) ? prev : [...prev, data.comment]
          );
          setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      },
      'comment:deleted': (data) => {
        if (String(data.task_id) === String(id)) {
          setComments((prev) => prev.filter((c) => c.id !== data.comment_id));
        }
      },
    },
    [`task:${id}`],
  );

  useEffect(() => { loadTask(); }, [id]);

  async function loadTask() {
    setLoading(true);
    try {
      const { data } = await laravelApi.get(`/tasks/${id}`);
      const t = data.data;
      setTask(t);
      setEditForm({
        title: t.title,
        description: t.description || '',
        priority: t.priority,
        assigned_to: t.assigned_to?.id || '',
        due_date: t.due_date ? t.due_date.slice(0, 16) : '',
      });
      if (t.team?.id) loadTeamMembers(t.team.id);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
      navigate('/tasks');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (!loading && task) loadComments(); }, [loading]); // eslint-disable-line

  async function loadComments() {
    setCommentsLoading(true);
    try {
      const { data } = await laravelApi.get(`/tasks/${id}/comments`);
      setComments(data.data || []);
    } catch {}
    finally { setCommentsLoading(false); }
  }

  async function loadTeamMembers(teamId) {
    try {
      const { data } = await laravelApi.get(`/teams/${teamId}`);
      setTeamMembers(data.data?.members || []);
    } catch {}
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await laravelApi.patch(`/tasks/${id}`, {
        ...editForm,
        assigned_to: editForm.assigned_to || null,
        due_date: editForm.due_date || null,
      });
      setTask(data.data);
      setEditing(false);
      addToast('Task updated.', 'success');
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus) {
    try {
      const { data } = await laravelApi.patch(`/tasks/${id}/status`, { status: newStatus });
      setTask(data.data);
      addToast(`Status updated to "${newStatus.replace('_', ' ')}".`, 'success');
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    }
  }

  async function handleDelete() {
    setShowDeleteConfirm(true);
  }

  async function executeDelete() {
    setShowDeleteConfirm(false);
    try {
      await laravelApi.delete(`/tasks/${id}`);
      addToast('Task deleted.', 'success');
      navigate('/tasks');
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    }
  }

  function handleCommentInput(e) {
    const val = e.target.value;
    setCommentBody(val);

    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const match = textBefore.match(/@([\w ]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionAnchor({ start: cursor - match[0].length, end: cursor });
      setShowMentions(true);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  }

  function insertMention(name) {
    if (!mentionAnchor) return;
    const before = commentBody.slice(0, mentionAnchor.start);
    const after  = commentBody.slice(mentionAnchor.end);
    const inserted = `@${name} `;
    setCommentBody(before + inserted + after);
    setShowMentions(false);
    setMentionQuery('');
    setTimeout(() => {
      const pos = (before + inserted).length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    }, 0);
  }

  function handleCommentKeyDown(e) {
    if (showMentions && mentionMatches().length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, mentionMatches().length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionMatches()[mentionIndex].name);
        return;
      }
      if (e.key === 'Escape') { setShowMentions(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommentSubmit(e); }
  }

  async function handleCommentSubmit(e) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setSubmittingComment(true);
    try {
      const { data } = await laravelApi.post(`/tasks/${id}/comments`, { body: commentBody });
      // Append locally; socket event from other users will also arrive and be deduped
      setComments((prev) =>
        prev.some((c) => c.id === data.data?.id) ? prev : [...prev, data.data]
      );
      setCommentBody('');
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleCommentDelete(commentId) {
    try {
      await laravelApi.delete(`/tasks/${id}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    }
  }

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;
  if (!task) return null;

  const canEdit = isAdmin || isManager || task.assigned_to?.id === user?.id;
  const canDelete = isAdmin || task.created_by?.id === user?.id;
  const transitions = STATUS_TRANSITIONS[task.status] || [];
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['completed', 'cancelled'].includes(task.status);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/tasks')} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Task Detail</h1>
        {canDelete && (
          <button onClick={handleDelete} className="btn-danger text-xs px-3 py-1.5">Delete</button>
        )}
      </div>

      <div className="card space-y-5">
        {/* Title + badges */}
        <div className="flex items-start gap-3">
          <div className="flex-1">
            {editing ? (
              <input value={editForm.title} onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))} className="input text-lg font-semibold" />
            ) : (
              <h2 className="text-xl font-semibold text-gray-900">{task.title}</h2>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className={`badge ${STATUS_COLORS[task.status]}`}>{task.status?.replace('_', ' ')}</span>
              <span className={`text-sm font-medium ${PRIORITY_COLORS[task.priority]}`}>● {task.priority}</span>
              {isOverdue && <span className="badge bg-red-100 text-red-700">⚠️ Overdue</span>}
            </div>
          </div>
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)} className="btn-secondary text-xs">Edit</button>
          )}
        </div>

        {/* Description */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase mb-1">Description</p>
          {editing ? (
            <textarea value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} className="input h-28 resize-none" />
          ) : (
            <p className="text-gray-700 text-sm">{task.description || <span className="text-gray-400 italic">No description.</span>}</p>
          )}
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase mb-1">Assigned To</p>
            {editing && (isAdmin || isManager) ? (
              <select value={editForm.assigned_to} onChange={(e) => setEditForm(f => ({ ...f, assigned_to: e.target.value }))} className="input">
                <option value="">Unassigned</option>
                {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            ) : (
              <p className="text-sm text-gray-700">{task.assigned_to?.name || '—'}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase mb-1">Team</p>
            <p className="text-sm text-gray-700">{task.team?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase mb-1">Priority</p>
            {editing ? (
              <select value={editForm.priority} onChange={(e) => setEditForm(f => ({ ...f, priority: e.target.value }))} className="input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            ) : (
              <p className={`text-sm font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase mb-1">Due Date</p>
            {editing ? (
              <input type="datetime-local" value={editForm.due_date} onChange={(e) => setEditForm(f => ({ ...f, due_date: e.target.value }))} className="input" />
            ) : (
              <p className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                {task.due_date ? new Date(task.due_date).toLocaleString() : '—'}
              </p>
            )}
          </div>
        </div>

        {editing && (
          <div className="flex gap-3 pt-3 border-t">
            <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary" disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : null}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Status transitions */}
      {canEdit && transitions.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Update Status</h3>
          <div className="flex flex-wrap gap-2">
            {transitions.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className="btn-secondary capitalize"
              >
                → {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="text-xs text-gray-400 space-y-1">
        <p>Created by: <span className="text-gray-500">{task.created_by?.name}</span></p>
        <p>Created: <span className="text-gray-500">{new Date(task.created_at).toLocaleString()}</span></p>
        <p>Last updated: <span className="text-gray-500">{new Date(task.updated_at).toLocaleString()}</span></p>
      </div>

      {/* ── Comments ───────────────────────────────────────────────────────── */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-gray-900">
          Comments <span className="text-gray-400 font-normal text-sm">({comments.length})</span>
        </h3>

        {commentsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 space-y-2">
                  <div className="flex gap-2">
                    <div className="h-3 w-20 bg-gray-200 rounded" />
                    <div className="h-3 w-28 bg-gray-100 rounded" />
                  </div>
                  <div className="h-3 w-3/4 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No comments yet. Be the first!</p>
        ) : null}

        {/* Clicked-mention user card */}
        {activeMention && (
          <div
            ref={mentionCardRef}
            className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-60"
            style={{
              top: Math.min(activeMention.rect.bottom + 8, window.innerHeight - 180),
              left: Math.min(activeMention.rect.left, window.innerWidth - 260),
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg shrink-0">
                {activeMention.member.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-gray-900 truncate">{activeMention.member.name}</p>
                <p className="text-xs text-gray-500 truncate">{activeMention.member.email}</p>
                <span className="inline-block mt-1 text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full capitalize font-medium">
                  {activeMention.member.role}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {comments.map((c) => {
            const isLong = c.body.length > COLLAPSE_THRESHOLD;
            const isExpanded = expandedComments.has(c.id);
            const displayBody = isLong && !isExpanded ? c.body.slice(0, COLLAPSE_THRESHOLD) + '…' : c.body;

            // Render body with @mention highlights (blue pill, click to view)
            const renderBody = (text) => {
              if (!teamMembers.length) return <span>{text}</span>;
              // Build regex from actual member names (longest first to avoid partial matches)
              const escaped = teamMembers
                .map((m) => m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .sort((a, b) => b.length - a.length);
              const mentionRe = new RegExp(`@(${escaped.join('|')})`, 'gi');
              const nodes = [];
              let last = 0;
              let match;
              mentionRe.lastIndex = 0;
              while ((match = mentionRe.exec(text)) !== null) {
                if (match.index > last) nodes.push(<span key={last}>{text.slice(last, match.index)}</span>);
                const matchedName = match[1];
                const member = teamMembers.find((m) => m.name.toLowerCase() === matchedName.toLowerCase());
                nodes.push(
                  <button
                    key={match.index}
                    type="button"
                    className="inline-flex items-center gap-0.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold text-xs rounded-full px-2 py-0.5 mx-0.5 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setActiveMention((prev) =>
                        prev?.member.id === member.id ? null : { member, rect }
                      );
                    }}
                  >
                    <span className="text-indigo-400">@</span>{member.name}
                  </button>
                );
                last = match.index + match[0].length;
              }
              if (last < text.length) nodes.push(<span key={last}>{text.slice(last)}</span>);
              return nodes.length ? nodes : <span>{text}</span>;
            };

            return (
              <div key={c.id} className="flex gap-3 group">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {c.author?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-800">{c.author?.name}</span>
                    <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
                    {(c.user_id === user?.id || isAdmin) && (
                      <button
                        onClick={() => handleCommentDelete(c.id)}
                        className="ml-auto text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {renderBody(displayBody)}
                  </p>
                  {isLong && (
                    <button
                      onClick={() => setExpandedComments((prev) => {
                        const next = new Set(prev);
                        isExpanded ? next.delete(c.id) : next.add(c.id);
                        return next;
                      })}
                      className="text-xs text-indigo-500 hover:text-indigo-700 mt-1 font-medium"
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={commentsEndRef} />
        </div>

        {/* Comment input with @mention autocomplete */}
        <div className="pt-2 border-t relative">
          {showMentions && mentionMatches().length > 0 && (
            <div className="absolute bottom-full mb-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg w-56 overflow-hidden z-20">
              <p className="text-xs text-gray-400 px-3 pt-2 pb-1 font-medium">Mention a teammate</p>
              {mentionMatches().map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${i === mentionIndex ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(m.name);
                  }}
                >
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {m.name[0].toUpperCase()}
                  </span>
                  <span className="truncate">{m.name}</span>
                  <span className="text-xs text-gray-400 ml-auto capitalize">{m.role}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={commentBody}
              onChange={handleCommentInput}
              placeholder="Write a comment… type @ to mention someone"
              rows={2}
              className="input flex-1 resize-none"
              onKeyDown={handleCommentKeyDown}
            />
            <button
              type="button"
              onClick={handleCommentSubmit}
              className="btn-primary self-end"
              disabled={submittingComment || !commentBody.trim()}
            >
              {submittingComment ? <LoadingSpinner size="sm" /> : 'Post'}
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Task" size="sm">
        <div className="space-y-4">
          <p className="text-gray-700">Are you sure you want to delete <span className="font-semibold">"{task?.title}"</span>? This action cannot be undone.</p>
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">All comments and activity logs for this task will also be removed.</p>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary">Cancel</button>
            <button onClick={executeDelete} className="btn-primary bg-red-600 hover:bg-red-700">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
