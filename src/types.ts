export interface BaseKM {
  PLACA: string;
  DATA: string;
  anoMes?: string;
  semanaAno?: string;
  KM_INICIAL: number;
  KM_FINAL: number;
  KM_TOTAL: number;
  KM_PRODUTIVO: number;
  OPERACAO?: string;
  FROTA?: string;
  MOTORISTA?: string;
  DESCRICAOGRC?: string;
  DESCRICAOGRE?: string;
  DESCRICAOGRD?: string;
  NF?: string;
  OS?: string;
  debug?: {
    original: string;
    converted: string;
    anoMes: string;
  };
}

export interface BaseCombustivel {
  PLACA: string;
  DATA: string;
  anoMes?: string;
  semanaAno?: string;
  LITROS: number;
  VALOR: number;
  KM?: number;
  TIPO_COMBUSTIVEL?: string;
  SERVICO?: string;
  CARTAO?: string;
  FROTA?: string;
  OPERACAO?: string;
  MOTORISTA?: string;
  DESCRICAOGRC?: string;
  DESCRICAOGRE?: string;
  DESCRICAOGRD?: string;
  NF?: string;
  OS?: string;
  debug?: {
    original: string;
    converted: string;
    anoMes: string;
  };
}

export interface BaseVeiculo {
  PLACA: string;
  CARTAO: string;
  FROTA: string;
  CORINGA?: string;
  OPERACAO?: string;
  MOTORISTA?: string;
  META?: number;
}

export interface MergedData {
  PLACA: string;
  DISPLAY_PLACA?: string;
  DATA: string;
  parsedDate?: Date | null;
  KM_INICIAL: number;
  KM_FINAL: number;
  KM_TOTAL: number;
  KM_PRODUTIVO: number;
  LITROS: number;
  VALOR: number;
  LITROS_AJUSTADOS?: number;
  VALOR_AJUSTADO?: number;
  IS_RATEIO: boolean;
  DIVERGENCIA_FLAG: boolean;
  CARTAO?: string;
  FROTA?: string;
  OPERACAO?: string;
  MOTORISTA?: string;
  TIPO_COMBUSTIVEL?: string;
  SERVICO?: string;
  DESCRICAOGRC?: string;
  DESCRICAOGRE?: string;
  DESCRICAOGRD?: string;
  NF?: string;
  OS?: string;
  KML: number;
  DISTANCE: number;
  isKMRecord?: boolean;
  CORINGA?: string;
  COMPETENCE_DATE?: string;
  SUPPLY_DATE?: string;
  MES_TRANSACAO?: string;
  MES_COMPETENCIA_CONSUMO?: string;
  FLAG_MES_CRUZADO?: boolean;
  semanaAno?: string;
  supplyDate?: string | null;
  // Data Quality Flags
  QUALITY_FLAGS?: {
    negativeKm?: boolean;
    impossibleKml?: boolean;
    missingFuel?: boolean;
    missingKm?: boolean;
    odometerGap?: boolean;
    duplicateFuel?: boolean;
    invalidNumbers?: boolean;
  };
  debug?: {
    original: string;
    converted: string;
    anoMes: string;
  };
}

export interface SQLAnalysis {
  id: string;
  title: string;
  query: string;
  result: string | any[];
  timestamp: string;
  description?: string;
  category?: string;
}

export interface BaseGps {
  DIA: string;
  VEICULO: string;
  TRABALHANDO: string;
  DISTANCIA: number;
  ODOMETRO: number;
  LATITUDE?: number;
  LONGITUDE?: number;
  LAT?: number;
  LNG?: number;
  VELOCIDADE?: number;
  LOCAL?: string;
  FROTA?: string;
  PLACA?: string;
}

export interface LastValidSaveInfo {
  timestamp: string; // ISO string
  formattedDate: string; // e.g. "08/09/2026"
  formattedTime: string; // e.g. "13:30:15"
  displayString: string; // e.g. "08/09/2026 às 13:30:15"
  tabName: string; // e.g. "Resumo Gerencial"
  activeTabId: string;
  totalRecordsCount?: number;
  activeFiltersCount?: number;
  userEmail?: string;
  source?: 'manual_button' | 'cloud_sync' | 'auto_snapshot';
  status: 'valid' | 'synced' | 'local_only';
  details?: string;
}

