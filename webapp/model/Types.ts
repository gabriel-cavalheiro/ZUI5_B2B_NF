/**
 * Tipos e Interfaces da Aplicação
 * @namespace br.com.inbetta.zui5b2bnf.model
 */

/**
 * Interface para filtros de seleção
 */
export interface IFiltros {
    dataInicio: Date | null;
    dataFim: Date | null;
    filiais: IFilial[];
    cargaInicial: boolean;
}

/**
 * Interface para filial
 */
export interface IFilial {
    key: string;
    text: string;
}

/**
 * Interface para resultado de processamento
 */
export interface IResultado {
    Status: string;
    Mensagem: string;
    QuantidadeProcessada: number;
    DataProcessamento: string | null;
}

/**
 * Interface para modelo de view
 */
export interface IViewModel {
    filtros: IFiltros;
    resultadoVisivel: boolean;
    resultado: IResultado;
    carregando: boolean;
}

/**
 * Interface para variante de filtros
 */
export interface IVariant {
    key: string;
    name: string;
    content: IFiltros;
}

/**
 * Interface para modelo de variantes
 */
export interface IVariantsModel {
    items: IVariant[];
    defaultKey: string;
    currentKey: string;
}

/**
 * Interface para modelo de help (ValueHelp)
 */
export interface IHelpModel {
    filiais: IFilial[];
}

/**
 * Interface para payload de processamento
 */
export interface IProcessarPayload {
    DataInicio: string;
    DataFim: string;
    Branch: string;
    CargaInicial: string;
}

/**
 * Interface para resposta de processamento
 */
export interface IProcessarResponse {
    ProcessarNotasId: string;
    Status: string;
    Mensagem: string;
    QuantidadeProcessada: string;
    DataProcessamento: string;
    Branch: string;
    NfNumero: string;
    DataInicio: string;
    DataFim: string;
    CargaInicial: string;
    CargaIncremental: string;
}

/**
 * Interface para erro de OData
 */
export interface IODataError {
    statusCode: number;
    statusText: string;
    responseText: string;
    message?: string;
}

/**
 * Interface para resposta de OData
 */
export interface IODataResponse<T> {
    results: T[];
}

/**
 * Tipos de validação
 */
export enum ValidationErrorType {
    PERIOD_REQUIRED = "PERIOD_REQUIRED",
    DATE_RANGE_INVALID = "DATE_RANGE_INVALID",
    START_DATE_AFTER_END_DATE = "START_DATE_AFTER_END_DATE",
    INVALID_DATE = "INVALID_DATE"
}

/**
 * Interface para erro de validação
 */
export interface IValidationError {
    type: ValidationErrorType;
    message: string;
}

/**
 * Status de carregamento
 */
export enum LoadingStatus {
    IDLE = "IDLE",
    LOADING = "LOADING",
    SUCCESS = "SUCCESS",
    ERROR = "ERROR"
}