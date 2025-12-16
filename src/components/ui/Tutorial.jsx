import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const steps = [
    {
        target: 'welcome-modal',
        title: '¡Bienvenido a Verano!',
        content: 'Descubre cómo reservar los mejores equipos para tu aventura en la playa de forma rápida y sencilla.',
        position: 'center'
    },
    {
        target: 'sede-selector',
        title: 'Elige tu Sede',
        content: 'Selecciona la ubicación donde deseas recoger tu equipo. Puedes ver información detallada de cada sede.',
        position: 'bottom-left'
    },
    {
        target: 'date-selector',
        title: 'Verifica Disponibilidad',
        content: 'Selecciona la fecha de tu reserva para ver el stock real disponible en tiempo real.',
        position: 'bottom'
    },
    {
        target: 'search-bar',
        title: 'Encuentra tu Equipo',
        content: 'Busca por nombre o categoría. Si dice "Agotado", es porque no hay stock para la fecha seleccionada.',
        position: 'bottom-right'
    },
    {
        target: 'explore-btn',
        title: '¡A Explorar!',
        content: 'Haz clic aquí para ver todos los resultados y comenzar tu aventura.',
        position: 'top-right'
    }
];

const Tutorial = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(0);
    const [coords, setCoords] = useState(null); // { top, left, width, height } for spotlight
    const [cardStyle, setCardStyle] = useState({}); // style for the card

    // Function to calculate positions
    const updatePosition = useCallback(() => {
        if (!isOpen) return;
        const step = steps[currentStep];

        // Mobile/Tablet Global Override (< 1024px)
        if (window.innerWidth < 1024) {
            // Calculate spotlight coords if target exists (optional on mobile but looks nice)
            let mobileCoords = null;
            if (step.target !== 'welcome-modal') {
                const element = document.getElementById(step.target);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    mobileCoords = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
                }
            }
            setCoords(mobileCoords);

            // Force Bottom Sheet Layout
            setCardStyle({
                position: 'fixed',
                bottom: '90px', // Raised to avoid bottom nav overlap
                left: '20px',
                right: '20px',
                width: 'auto',
                maxWidth: 'none',
                transform: 'none',
                maxHeight: '40vh',
                overflowY: 'auto',
                zIndex: 101,
                // Ensure text is readable
                margin: '0 auto'
            });
            return;
        }

        // DESKTOP LOGIC ------------------------------------------------

        // Case: Modal Center
        if (step.target === 'welcome-modal') {
            setCoords(null);
            setCardStyle({
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                position: 'fixed'
            });
            return;
        }

        // Case: Target Element
        const element = document.getElementById(step.target);
        if (element) {
            const rect = element.getBoundingClientRect();

            // Spotlight coords
            setCoords({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
            });

            // Desktop positioning logic
            let top = rect.bottom + 20;
            let left = rect.left + (rect.width / 2);
            let transform = 'translateX(-50%)';

            if (step.position === 'bottom-left') {
                left = rect.left;
                transform = 'translateX(0)';
            } else if (step.position === 'bottom-right') {
                left = rect.right;
                transform = 'translateX(-100%)';
            } else if (step.position === 'top-right') {
                top = rect.top - 20;
                left = rect.right;
                transform = 'translate(-100%, -100%)';
            }

            // Boundary checks
            const padding = 20;
            if (left < padding) left = padding;
            if (left > window.innerWidth - padding) left = window.innerWidth - padding;

            setCardStyle({
                top,
                left,
                transform,
                position: 'fixed'
            });
        }
    }, [isOpen, currentStep]);

    // Setup listeners
    useEffect(() => {
        if (isOpen) {
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, { capture: true, passive: true });

            // Initial update
            updatePosition();

            // Polling interval to handle animations/layout shifts
            const interval = setInterval(updatePosition, 100);

            return () => {
                window.removeEventListener('resize', updatePosition);
                window.removeEventListener('scroll', updatePosition, { capture: true });
                clearInterval(interval);
            };
        }
    }, [isOpen, updatePosition]);

    // Handle Step Change (Scroll to element)
    useEffect(() => {
        if (isOpen && steps[currentStep].target !== 'welcome-modal') {
            const element = document.getElementById(steps[currentStep].target);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Update after scroll starts and finishes
                setTimeout(updatePosition, 100);
                setTimeout(updatePosition, 300);
                setTimeout(updatePosition, 500);
                setTimeout(updatePosition, 800);
            }
        }
    }, [currentStep, isOpen, updatePosition]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleClose();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleClose = () => {
        onClose();
        // Reset step after animation/delay could be better, but immediate is fine
        setTimeout(() => setCurrentStep(0), 300);
        localStorage.setItem('tutorial_seen', 'true');
    };

    if (!isOpen) return null;

    const step = steps[currentStep];

    return (
        <div className="fixed inset-0 z-[100]">
            {/* Backdrop with "hole" using borders if coords exist, else full dim */}
            {coords ? (
                // Complex overlay to create a "hole"
                <div
                    className="absolute inset-0 pointer-events-none transition-all duration-300 ease-out"
                    style={{
                        // This boxShadow creates a huge translucent border around the clear center
                        boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.6)`,
                        borderRadius: '12px',
                        border: '4px solid #3b82f6', // blue-500 ring
                        // Position exactly over the element
                        top: coords.top - 4,
                        left: coords.left - 4,
                        width: coords.width + 8,
                        height: coords.height + 8,
                    }}
                />
            ) : (
                // Fallback full backdrop for modal steps
                <div className={`absolute inset-0 bg-black/60 transition-opacity duration-500`} onClick={handleClose} />
            )}

            {/* Click interceptor for outside closing (only for modal mode or if desired) */}
            {/* For spotlight mode, the hole overlay covers everywhere EXCEPT the hole, 
                so clicks on the hole go through? No, box-shadow overlay is pointer-events-none.
                We need a separate backdrop to catch clicks? 
                Actually, standard approach: Put a transparent div everywhere else to block clicks?
                Current implementation: pointer-events-none on overlay allows clicking the underlying app! 
                That's actually GOOD for a "hands-on" tutorial, but bad if we want to force next.
                Let's block interaction for now with a full screen transparent div behind the card but above the app?
                
                Correction: We want to BLOCK interaction with the app while tutorial is open?
                Usually yes.
            */}
            <div className="absolute inset-0 z-[-1]" onClick={handleClose} />


            {/* Card */}
            <div
                className={`bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full transition-all duration-300 absolute ${step.target === 'welcome-modal' ? 'animate-fade-in-up' : ''}`}
                style={cardStyle}
            >
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <p className="text-gray-600 mb-6 leading-relaxed">
                    {step.content}
                </p>

                <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-400">
                        {currentStep + 1} / {steps.length}
                    </span>

                    <div className="flex gap-2">
                        {currentStep > 0 && (
                            <button
                                onClick={handlePrev}
                                className="px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium text-sm flex items-center gap-1"
                            >
                                <ChevronLeft size={16} /> Atrás
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold text-sm flex items-center gap-1 shadow-lg shadow-blue-500/30"
                        >
                            {currentStep === steps.length - 1 ? '¡Listo!' : 'Siguiente'}
                            {currentStep < steps.length - 1 && <ChevronRight size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Tutorial;
