/**
 * Cadastral GeoJSON Import & Processing Modal
 * Allows uploading standard 2D/3D Cadastral GeoJSON files or testing pre-packaged synthetic datasets
 */

import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  FileCheck2, 
  AlertCircle, 
  Layers, 
  Sparkles, 
  FileText, 
  ArrowRight,
  Database,
  CheckCircle2
} from 'lucide-react';
import { parseCadastralGeoJSON, SAMPLE_IMPORTABLE_GEOJSON, ImportValidationResult } from '../utils/geoJsonImporter';
import { CadastralParcel } from '../types/cadastre';

interface GeoJsonImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportParcels: (newParcels: CadastralParcel[], replaceExisting: boolean) => void;
}

export const GeoJsonImportModal: React.FC<GeoJsonImportModalProps> = ({
  isOpen,
  onClose,
  onImportParcels,
}) => {
  const [geoJsonInput, setGeoJsonInput] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setGeoJsonInput(text);
      validateContent(text);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setFileName('bengaluru_ward152_specimen.geojson');
    setGeoJsonInput(SAMPLE_IMPORTABLE_GEOJSON);
    validateContent(SAMPLE_IMPORTABLE_GEOJSON);
  };

  const validateContent = (text: string) => {
    setIsProcessing(true);
    setTimeout(() => {
      const result = parseCadastralGeoJSON(text);
      setValidationResult(result);
      setIsProcessing(false);
    }, 200);
  };

  const handleConfirmImport = () => {
    if (!validationResult || !validationResult.success) return;
    onImportParcels(validationResult.parcels, replaceExisting);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Cadastral GeoJSON Data Ingestion Pipeline
              </h2>
              <p className="text-xs text-slate-400">
                Upload 2D Land Parcels & Building Footprints to auto-extrude 3D volumetric units
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          
          {/* File Ingestion Dropzone & Preset Specimen Button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Custom Upload Card */}
            <label className="border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-950/60 hover:bg-slate-950 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
              <UploadCloud className="w-8 h-8 text-blue-400 mb-2" />
              <span className="font-bold text-slate-200 block">Select or Drop GeoJSON File</span>
              <span className="text-[11px] text-slate-500 mt-1">Accepts standard .geojson or .json</span>
              <input
                type="file"
                accept=".geojson,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Quick Demo Specimen Button */}
            <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Test Synthetic Specimen Dataset</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Load pre-configured 2-parcel urban extension with residential tower & commercial complex (Ward 152).
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadSample}
                className="mt-3 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Load Synthetic GeoJSON Sample</span>
              </button>
            </div>

          </div>

          {/* Textarea / Inspect raw payload preview */}
          {geoJsonInput && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span>Loaded Content ({fileName || 'Custom Payload'}):</span>
                <span className="font-mono text-[10px] text-slate-500">{geoJsonInput.length} chars</span>
              </div>
              <textarea
                value={geoJsonInput}
                onChange={(e) => {
                  setGeoJsonInput(e.target.value);
                  validateContent(e.target.value);
                }}
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Validation & Processing Engine Output */}
          {isProcessing && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-400">Executing 2D-to-3D geometric parsing & strata segmentation...</p>
            </div>
          )}

          {validationResult && !isProcessing && (
            <div className={`p-4 rounded-xl border ${
              validationResult.success 
                ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-200'
                : 'bg-rose-950/20 border-rose-800/60 text-rose-200'
            }`}>
              <div className="flex items-center gap-2 font-bold mb-2">
                {validationResult.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>2D-to-3D Transformation Pipeline Ready</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>Validation Error in Ingested Data</span>
                  </>
                )}
              </div>

              {validationResult.errorMessage && (
                <p className="text-rose-300 font-mono text-xs mb-2">
                  {validationResult.errorMessage}
                </p>
              )}

              {/* Processing Pipeline Logs */}
              <div className="space-y-1 bg-slate-950/80 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300">
                {validationResult.logMessages.map((msg, idx) => (
                  <div key={idx} className="text-emerald-400">{msg}</div>
                ))}
              </div>

              {/* Quantitative Metrics Badge */}
              {validationResult.success && (
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Parcels</span>
                    <span className="font-bold font-mono text-white text-sm">{validationResult.parcelsCount}</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">3D Buildings</span>
                    <span className="font-bold font-mono text-white text-sm">{validationResult.buildingsCount}</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Extruded Units</span>
                    <span className="font-bold font-mono text-blue-400 text-sm">{validationResult.unitsCount}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Replacement vs Append Mode Toggle */}
          {validationResult?.success && (
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div>
                <span className="font-semibold text-slate-200 block">Ingestion Mode:</span>
                <span className="text-[11px] text-slate-400">
                  {replaceExisting ? 'Replace current parcels with imported dataset' : 'Append to existing demo parcels'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReplaceExisting(false)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    !replaceExisting ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Append
                </button>
                <button
                  type="button"
                  onClick={() => setReplaceExisting(true)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    replaceExisting ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Replace All
                </button>
              </div>
            </div>
          )}

          {/* Research & Data Provenance Notice */}
          <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <div className="font-bold text-slate-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>Data Provenance & Ingestion Note:</span>
            </div>
            <p>
              Imported GeoJSON is processed purely client-side in the browser. 3D building envelopes, floor strata, and Proposed Prototype 3D Property Identifiers are calculated geometrically without external server dependencies.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirmImport}
            disabled={!validationResult || !validationResult.success}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all cursor-pointer"
          >
            <span>Render 3D Cadastral Space</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
