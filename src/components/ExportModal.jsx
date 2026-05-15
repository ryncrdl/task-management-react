import { useState } from 'react';
import Modal from './Modal';
import { nodeApi } from '../api/axiosConfig';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from './LoadingSpinner';

export default function ExportModal({ isOpen, onClose, teamId }) {
  const { addToast } = useToast();
  const [format, setFormat] = useState('csv');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    if (!teamId) {
      addToast('Please select a team first.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await nodeApi.post(
        '/export/tasks',
        {
          team_id: teamId,
          format,
          filters: {
            ...(status && { status }),
            ...(dateFrom && { date_from: dateFrom }),
            ...(dateTo && { date_to: dateTo }),
          },
        },
        {
          responseType: format === 'json' ? 'json' : 'blob',
        }
      );

      const contentDisposition = response.headers['content-disposition'];
      const filename =
        contentDisposition?.match(/filename="?([^"]+)"?/)?.[1] ||
        `tasks-export.${format}`;

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: 'application/json',
        });
        downloadBlob(blob, filename);
      } else {
        downloadBlob(response.data, filename);
      }

      addToast('Export completed successfully.', 'success');
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Export failed.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Tasks">
      <div className="space-y-4">
        <div>
          <label className="label">Format</label>
          <div className="flex gap-3">
            {['csv', 'json', 'xlsx'].map((f) => (
              <label key={f} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value={f}
                  checked={format === f}
                  onChange={(e) => setFormat(e.target.value)}
                  className="text-blue-600"
                />
                <span className="text-sm font-medium uppercase text-gray-700">{f}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Filter by Status (optional)</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Date To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button onClick={onClose} className="btn-secondary" disabled={loading}>
            Cancel
          </button>
          <button onClick={handleExport} className="btn-primary" disabled={loading}>
            {loading ? <LoadingSpinner size="sm" /> : null}
            {loading ? 'Exporting…' : `Export ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
