export default function FormInput({ label, name, type = 'text', value, onChange, placeholder }) {
  return (
    <label className="form-row">
      <span className="label">{label}</span>
      <input
        className="input"
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder || label}
        autoComplete="off"
        required
      />
    </label>
  )
}
