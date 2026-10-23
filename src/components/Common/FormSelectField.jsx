import React, { useEffect } from 'react';
import { getSelectOptions, getColumnDependency } from '../../utils/formOptions';

export default function FormSelectField({ col, val, columns = [], formData = {}, onChange, size = 'md' }) {
  const options = getSelectOptions(col, formData);
  const dependency = getColumnDependency(col);
  const parentCol = dependency ? columns.find(c => c.name === dependency) : null;
  const parentVal = dependency ? formData[dependency] : null;
  const isLocked = !!(dependency && (!parentVal || parentVal === ''));

  // Automatically select the first option when unlocked so there is always a valid choice and no placeholder
  useEffect(() => {
    if (!isLocked && options.length > 0 && (!val || !options.includes(val))) {
      onChange(col.name, options[0]);
    }
  }, [isLocked, options, val]);

  const inputClass = size === 'xs'
    ? 'w-full px-3 py-2 text-xs'
    : 'w-full px-3 py-2 text-sm';

  return (
    <div className="space-y-1">
      <select
        value={val || (options[0] ?? '')}
        onChange={(e) => onChange(col.name, e.target.value)}
        required={!!col.required}
        disabled={isLocked}
        className={`${inputClass} border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-colors cursor-pointer ${
          isLocked
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : 'border-slate-200 text-slate-800'
        }`}
      >
        {isLocked && (
          <option value="" disabled>
            -- En attente de {parentCol?.label || dependency} --
          </option>
        )}
        {options.map((opt, i) => (
          <option key={i} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {dependency && (
        <p className="text-[10px] text-slate-400 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
          <span>Dépend de : <strong className="text-slate-600">{parentCol?.label || dependency}</strong></span>
          {parentVal ? (
            <span className="text-indigo-600 font-medium">({parentVal})</span>
          ) : (
            <span className="italic text-slate-400">(en attente)</span>
          )}
        </p>
      )}
    </div>
  );
}
