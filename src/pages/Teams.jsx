import { useEffect, useState } from 'react';
import { laravelApi, getErrorMessage } from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { TeamCardSkeleton } from '../components/Skeletons';

export default function Teams() {
  const { isAdmin, isManager, user } = useAuth();
  const { addToast } = useToast();

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [saving, setSaving] = useState(false);

  const [showAddMember, setShowAddMember] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [addMemberId, setAddMemberId] = useState('');
  const [addMemberRole, setAddMemberRole] = useState('member');

  const [confirmRemove, setConfirmRemove] = useState(null); // { teamId, userId, name }

  useEffect(() => { loadTeams(); }, []);

  async function loadTeams() {
    setLoading(true);
    try {
      const { data } = await laravelApi.get('/teams');
      setTeams(data.data || []);
    } catch {} finally { setLoading(false); }
  }

  async function loadTeamDetail(teamId) {
    try {
      const { data } = await laravelApi.get(`/teams/${teamId}`);
      setSelectedTeam(data.data);
    } catch {}
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await laravelApi.post('/teams', { name: teamName });
      addToast('Team created.', 'success');
      setTeamName('');
      setShowCreate(false);
      loadTeams();
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally { setSaving(false); }
  }

  async function loadUsersForAdd() {
    try {
      const { data } = await laravelApi.get('/users', { params: { per_page: 100 } });
      setAllUsers(data.data || []);
    } catch {}
  }

  function openAddMember(team) {
    setSelectedTeam(team);
    setShowAddMember(true);
    loadUsersForAdd();
  }

  async function handleAddMember(e) {
    e.preventDefault();
    if (!addMemberId) { addToast('Select a user.', 'warning'); return; }
    setSaving(true);
    try {
      await laravelApi.post(`/teams/${selectedTeam.id}/members`, { user_id: Number(addMemberId), role: addMemberRole });
      addToast('Member added.', 'success');
      setShowAddMember(false);
      loadTeamDetail(selectedTeam.id);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally { setSaving(false); }
  }

  async function handleRemoveMember() {
    if (!confirmRemove) return;
    const { teamId, userId } = confirmRemove;
    setConfirmRemove(null);
    try {
      await laravelApi.delete(`/teams/${teamId}/members/${userId}`);
      addToast('Member removed.', 'success');
      loadTeamDetail(teamId);
    } catch (err) { addToast(getErrorMessage(err), 'error'); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
        {(isAdmin || isManager) && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ New Team</button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <TeamCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div key={team.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{team.name}</h3>
                <span className="badge bg-blue-50 text-blue-600">{team.members_count || 0} members</span>
              </div>
              <p className="text-xs text-gray-400 mb-4">Created by {team.creator?.name}</p>
              <div className="flex gap-2">
                <button onClick={() => loadTeamDetail(team.id)} className="btn-secondary text-xs">View Members</button>
                {(isAdmin || isManager) && (
                  <button onClick={() => openAddMember(team)} className="btn-primary text-xs">+ Add Member</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team Members Panel */}
      {selectedTeam?.members && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">{selectedTeam.name} — Members</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase">
                  <th className="pb-2">Name</th><th className="pb-2">Email</th>
                  <th className="pb-2">Role</th><th className="pb-2">Team Role</th>
                  {(isAdmin || isManager) && <th className="pb-2"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {selectedTeam.members.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 font-medium">{m.name}</td>
                    <td className="py-2 text-gray-500">{m.email}</td>
                    <td className="py-2 capitalize">{m.role}</td>
                    <td className="py-2"><span className={`badge ${m.pivot?.role === 'lead' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{m.pivot?.role}</span></td>
                    {(isAdmin || isManager) && (
                      <td className="py-2 text-right">
                        {m.id !== user?.id && (
                          <button onClick={() => setConfirmRemove({ teamId: selectedTeam.id, userId: m.id, name: m.name })} className="text-xs text-red-500 hover:underline">Remove</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Team">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Team Name *</label>
            <input value={teamName} onChange={(e) => setTeamName(e.target.value)} className="input" placeholder="e.g. Engineering" required />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : null}
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Remove Member Modal */}
      <Modal isOpen={!!confirmRemove} onClose={() => setConfirmRemove(null)} title="Remove Member">
        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to remove <span className="font-semibold">{confirmRemove?.name}</span> from the team?
        </p>
        <div className="flex justify-end gap-3 pt-2 border-t">
          <button type="button" onClick={() => setConfirmRemove(null)} className="btn-secondary">Cancel</button>
          <button type="button" onClick={handleRemoveMember} className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Remove</button>
        </div>
      </Modal>

      {/* Add Member Modal */}
      <Modal isOpen={showAddMember} onClose={() => setShowAddMember(false)} title="Add Team Member">
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="label">User *</label>
            <select value={addMemberId} onChange={(e) => setAddMemberId(e.target.value)} className="input">
              <option value="">Select user…</option>
              {allUsers.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Team Role</label>
            <select value={addMemberRole} onChange={(e) => setAddMemberRole(e.target.value)} className="input">
              <option value="member">Member</option>
              <option value="lead">Lead</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={() => setShowAddMember(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : null}
              {saving ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
