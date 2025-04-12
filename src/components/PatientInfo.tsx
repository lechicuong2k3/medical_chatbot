import React, { useState, useEffect } from 'react';
import { Edit2, Save, Plus, Trash2, X, User, Clipboard } from 'lucide-react';
import './PatientInfo.css';

interface PatientData {
  age: string | number;
  gender: string;
  height: string | number;
  weight: string | number;
  bloodPressure: string;
  history: string;
  [key: string]: string | number; // Index signature for dynamic fields
}

interface PatientInfoProps {
  onPatientInfoChange?: (patientInfo: PatientData) => void;
  darkMode?: boolean;
}

const PatientInfo: React.FC<PatientInfoProps> = ({ onPatientInfoChange, darkMode = false }) => {
  const [patientInfo, setPatientInfo] = useState<PatientData>({
    age: '',
    gender: '',
    height: '',
    weight: '',
    bloodPressure: '',
    history: '',
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Load patient info from localStorage on initial render
  useEffect(() => {
    const savedInfo = localStorage.getItem('patientInfo');
    if (savedInfo) {
      try {
        const parsedInfo = JSON.parse(savedInfo);
        setPatientInfo(parsedInfo);
        
        // Extract custom fields
        const standardFields = ['age', 'gender', 'height', 'weight', 'bloodPressure', 'history'];
        const custom = Object.keys(parsedInfo).filter(key => !standardFields.includes(key));
        setCustomFields(custom);
      } catch (error) {
        console.error('Error parsing patient info:', error);
      }
    }
  }, []);

  // Save patient info to localStorage whenever it changes
  useEffect(() => {
    if (Object.values(patientInfo).some(value => value !== '')) {
      localStorage.setItem('patientInfo', JSON.stringify(patientInfo));
      
      if (onPatientInfoChange) {
        onPatientInfoChange(patientInfo);
      }
    }
  }, [patientInfo, onPatientInfoChange]);

  const handleInputChange = (field: string, value: string | number) => {
    setPatientInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleAddCustomField = () => {
    if (newFieldName.trim() && !customFields.includes(newFieldName)) {
      setCustomFields(prev => [...prev, newFieldName]);
      setPatientInfo(prev => ({ ...prev, [newFieldName]: '' }));
      setNewFieldName('');
    }
  };

  const handleRemoveCustomField = (field: string) => {
    setCustomFields(prev => prev.filter(f => f !== field));
    setPatientInfo(prev => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  const saveChanges = () => {
    setIsEditing(false);
    localStorage.setItem('patientInfo', JSON.stringify(patientInfo));
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    // If we're closing and were in edit mode, save changes
    if (isOpen && isEditing) {
      saveChanges();
    }
  };

  // Get a summary of patient info for the button tooltip
  const getPatientSummary = () => {
    const summaryParts = [];
    if (patientInfo.age) summaryParts.push(`Age: ${patientInfo.age}`);
    if (patientInfo.gender) summaryParts.push(`Gender: ${patientInfo.gender}`);
    
    if (summaryParts.length === 0) return "No patient data";
    return summaryParts.join(', ');
  };

  return (
    <>
      {/* Patient info button */}
      <button 
        className={`patient-info-button ${darkMode ? 'dark' : ''}`}
        onClick={toggleOpen}
        title={getPatientSummary()}
      >
        <User size={16} />
        <span>Patient Info</span>
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div className={`patient-modal-overlay ${darkMode ? 'dark' : ''}`} onClick={toggleOpen}>
          {/* Modal content - prevent click propagation to avoid closing when clicking inside */}
          <div 
            className={`patient-modal-content ${darkMode ? 'dark' : ''}`} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="patient-modal-header">
              <h2>Patient Information</h2>
              <div className="patient-modal-controls">
                {isEditing ? (
                  <button onClick={saveChanges} className="save-button" title="Save changes">
                    <Save size={18} />
                  </button>
                ) : (
                  <button onClick={toggleEditMode} className="edit-button" title="Edit information">
                    <Edit2 size={18} />
                  </button>
                )}
                <button onClick={toggleOpen} className="close-button" title="Close">
                  <X size={18} />
                </button>
              </div>
            </div>
            
            <div className="patient-modal-body">
              <table className={`patient-info-table ${darkMode ? 'dark' : ''}`}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Category</th>
                    <th>Patient Info</th>
                    {isEditing && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>Age</td>
                    <td>
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={patientInfo.age} 
                          onChange={(e) => handleInputChange('age', e.target.value)}
                        />
                      ) : (
                        patientInfo.age || 'N/A'
                      )}
                    </td>
                    {isEditing && <td></td>}
                  </tr>
                  <tr>
                    <td>2</td>
                    <td>Gender</td>
                    <td>
                      {isEditing ? (
                        <select 
                          value={patientInfo.gender as string} 
                          onChange={(e) => handleInputChange('gender', e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        patientInfo.gender || 'N/A'
                      )}
                    </td>
                    {isEditing && <td></td>}
                  </tr>
                  <tr>
                    <td>3</td>
                    <td>Height</td>
                    <td>
                      {isEditing ? (
                        <div className="input-with-unit">
                          <input 
                            type="number" 
                            value={patientInfo.height} 
                            onChange={(e) => handleInputChange('height', e.target.value)}
                          />
                          <span>cm</span>
                        </div>
                      ) : (
                        patientInfo.height ? `${patientInfo.height} cm` : 'N/A'
                      )}
                    </td>
                    {isEditing && <td></td>}
                  </tr>
                  <tr>
                    <td>4</td>
                    <td>Weight</td>
                    <td>
                      {isEditing ? (
                        <div className="input-with-unit">
                          <input 
                            type="number" 
                            value={patientInfo.weight} 
                            onChange={(e) => handleInputChange('weight', e.target.value)}
                          />
                          <span>kg</span>
                        </div>
                      ) : (
                        patientInfo.weight ? `${patientInfo.weight} kg` : 'N/A'
                      )}
                    </td>
                    {isEditing && <td></td>}
                  </tr>
                  <tr>
                    <td>5</td>
                    <td>Blood pressure</td>
                    <td>
                      {isEditing ? (
                        <input 
                          type="text" 
                          value={patientInfo.bloodPressure as string} 
                          onChange={(e) => handleInputChange('bloodPressure', e.target.value)}
                          placeholder="e.g. 120/80"
                        />
                      ) : (
                        patientInfo.bloodPressure || 'N/A'
                      )}
                    </td>
                    {isEditing && <td></td>}
                  </tr>
                  <tr>
                    <td>6</td>
                    <td>History</td>
                    <td>
                      {isEditing ? (
                        <textarea 
                          value={patientInfo.history as string} 
                          onChange={(e) => handleInputChange('history', e.target.value)}
                          placeholder="Medical history..."
                        />
                      ) : (
                        patientInfo.history || 'N/A'
                      )}
                    </td>
                    {isEditing && <td></td>}
                  </tr>
                  
                  {/* Custom fields */}
                  {customFields.map((field, index) => (
                    <tr key={field}>
                      <td>{index + 7}</td>
                      <td>{field}</td>
                      <td>
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={patientInfo[field] as string} 
                            onChange={(e) => handleInputChange(field, e.target.value)}
                          />
                        ) : (
                          patientInfo[field] || 'N/A'
                        )}
                      </td>
                      {isEditing && (
                        <td>
                          <button 
                            className="remove-field-button" 
                            onClick={() => handleRemoveCustomField(field)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  
                  {/* Add new field row */}
                  {isEditing && (
                    <tr className="add-field-row">
                      <td>{customFields.length + 7}</td>
                      <td>
                        <input 
                          type="text" 
                          value={newFieldName} 
                          onChange={(e) => setNewFieldName(e.target.value)}
                          placeholder="New field name"
                        />
                      </td>
                      <td>
                        <button 
                          className="add-field-button" 
                          onClick={handleAddCustomField}
                          disabled={!newFieldName.trim()}
                        >
                          <Plus size={16} /> Add
                        </button>
                      </td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PatientInfo; 