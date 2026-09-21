/**
 * Interactive 15-Step Guided Demo Walkthrough for SIH26011 Judges
 */

import React, { useState } from 'react';
import { 
  PlayCircle, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  X, 
  Sparkles, 
  Layers, 
  Box, 
  Sliders, 
  ShieldAlert, 
  Search, 
  Award 
} from 'lucide-react';

interface DemoStep {
  stepNumber: number;
  title: string;
  description: string;
  actionText: string;
  actionHandler: () => void;
}

interface GuidedDemoTourProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteDemoStep: (step: number) => void;
}

export const GuidedDemoTour: React.FC<GuidedDemoTourProps> = ({
  isOpen,
  onClose,
  onExecuteDemoStep,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps = [
    {
      title: "1. Urban 3D Cadastral Overview",
      description: "Initialize the 3D WebGIS viewer showcasing high-density urban land parcels anchored to Bangalore WGS84 coordinates with 2D Bhu-Aadhaar survey identifiers.",
      actionText: "View City Cadastre",
    },
    {
      title: "2. 2D Parcel Boundary Inspection",
      description: "Inspect Parcel P001 (Sy. No. 44/2, 3600 m²). Notice the 2D cadastral boundary polygon and centroid coordinates on the ground plane.",
      actionText: "Select Parcel P001",
    },
    {
      title: "3. 2D-to-3D Building Extrusion",
      description: "Transform the 2D building footprint into a volumetric 3D building envelope representing Surya Heights Tower A (10 Floors above ground + 2 Basements).",
      actionText: "Extrude 3D Building",
    },
    {
      title: "4. Vertical Floor Explosion (3D Property View)",
      description: "Activate vertical floor separation. The 3D building smoothly separates vertically along the Z-axis to reveal interior floor slabs and spatial strata.",
      actionText: "Explode Building Floors",
    },
    {
      title: "5. Floor Level 5 Isolation",
      description: "Isolate Floor 5 (+16.4m to +19.6m elevation). The system divides the floor into 4 discrete residential property units (Flats 501, 502, 503, 504).",
      actionText: "Isolate Floor 5",
    },
    {
      title: "6. Volumetric Property Unit & Prototype 3D-ULPIN",
      description: "Select Flat 501. Inspect its exact 3D volume (832 m³), carpet area, title holder (Rajesh Verma), and systematic Prototype 3D ULPIN: IN-KA-BLR-P001-B01-F05-U501.",
      actionText: "Inspect Flat 501 Record",
    },
    {
      title: "7. Sub-Surface & Basement Visualization",
      description: "Activate transparent subterranean mode. Reveal Basement B1 (Vehicle parking) and Basement B2 (-6.4m depth, central HVAC & backup utilities).",
      actionText: "Show Underground Basements",
    },
    {
      title: "8. Sub-Surface Public Transit Easement",
      description: "Navigate to Parcel P004 showing how 3D ULPIN models underground public infrastructure (Underground Metro rail box at -14m depth).",
      actionText: "Inspect Metro Easement Box",
    },
    {
      title: "9. Automated 3D Boundary & Topology Audit",
      description: "Trigger the 3D topology engine to perform ray-casting containment and 3D bounding-box intersection checks across all urban properties.",
      actionText: "Run 3D Validation Engine",
    },
    {
      title: "10. Volumetric Overlap Collision Flag (Parcel P003)",
      description: "Inspect Floor 3 of Vakil Enclave. The system flags an 18.2 m³ spatial overlap between Flat 301 and Flat 302 where dual deeds were registered.",
      actionText: "Inspect Unit Overlap Conflict",
    },
    {
      title: "11. Parcel Boundary Cantilever Overhang Encroachment",
      description: "Inspect Floor 4 of Vakil Enclave. The system detects Flat 402 cantilever balcony extending 4.0m beyond the 2D ground parcel setback boundary.",
      actionText: "Inspect Setback Encroachment",
    },
    {
      title: "12. Omnibox 3D Search & Camera Fly-To",
      description: "Demonstrate searching across parcels, 2D Bhu-Aadhaar numbers, 3D ULPIN codes, and owner names with automatic 3D camera centering.",
      actionText: "Execute 3D Search Demo",
    },
    {
      title: "13. Presentation Complete",
      description: "You have demonstrated a comprehensive 2D-to-3D cadastral transformation, volumetric segmentation, 3D ULPIN generation, and topology validation workflow!",
      actionText: "Finish Walkthrough",
    },
  ];

  if (!isOpen) return null;

  const current = steps[currentStepIndex];

  const handleNext = () => {
    onExecuteDemoStep(currentStepIndex + 1);
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      onExecuteDemoStep(currentStepIndex - 1);
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleExecuteCurrent = () => {
    onExecuteDemoStep(currentStepIndex);
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 select-none">
      <div className="bg-slate-900/98 backdrop-blur-2xl border-2 border-amber-500/80 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs">
              {currentStepIndex + 1}
            </span>
            <h3 className="font-bold text-white text-sm">
              SIH Interactive Demo Tour ({currentStepIndex + 1}/{steps.length})
            </h3>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Content */}
        <div className="space-y-2">
          <h4 className="text-amber-400 font-bold text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            {current.title}
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-3">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            onClick={handleExecuteCurrent}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-bold rounded-lg text-xs shadow-lg flex items-center gap-1.5 transition-all active:scale-95"
          >
            <PlayCircle className="w-4 h-4 text-slate-950" />
            <span>{current.actionText}</span>
          </button>

          <button
            onClick={handleNext}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
          >
            <span>{currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
