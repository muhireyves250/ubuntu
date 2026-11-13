// Acknowledgements are stored by the API (/patient-acknowledgments); this
// file only keeps the shared shape.
export interface AcknowledgedAlert {
  patientId: string;
  acknowledgedAt: string;
  note: string;
}
