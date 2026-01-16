/**
 * Serviço para lógica de filtros
 * @namespace br.com.inbetta.zui5b2bnf.service
 */

import { IFiltros, IProcessarPayload, IValidationError } from "../model/Types";
import { DateUtil } from "../util/DateUtil";
import { ValidationUtil } from "../util/ValidationUtil";

/**
 * Serviço responsável por lógica de filtros
 * Responsabilidades:
 * - Validar filtros
 * - Criar payload para OData
 * - Gerenciar estado de filtros
 */
export class FilterService {
    /**
     * Valida os filtros
     * @param oFiltros - Filtros a validar
     * @returns Array de erros (vazio se válido)
     */
    public validateFilters(oFiltros: IFiltros): IValidationError[] {
        return ValidationUtil.validateFilters(oFiltros);
    }

    /**
     * Verifica se os filtros são válidos
     * @param oFiltros - Filtros a verificar
     * @returns true se válido, false caso contrário
     */
    public isValid(oFiltros: IFiltros): boolean {
        return ValidationUtil.isValid(oFiltros);
    }

    /**
     * Cria o payload para enviar ao OData
     * @param oFiltros - Filtros a converter em payload
     * @returns Payload formatado para OData
     * @throws Erro se filtros inválidos
     */
    public createPayload(oFiltros: IFiltros): IProcessarPayload {
        // Validar antes de criar payload
        const aErrors = this.validateFilters(oFiltros);
        if (aErrors.length > 0) {
            throw new Error(ValidationUtil.getFirstErrorMessage(aErrors));
        }

        const bTemDataInicio = oFiltros.dataInicio !== null && oFiltros.dataInicio !== undefined;
        const bTemDataFim = oFiltros.dataFim !== null && oFiltros.dataFim !== undefined;

        return {
            DataInicio: bTemDataInicio ? DateUtil.formatDateToOData(oFiltros.dataInicio!) : "",
            DataFim: bTemDataFim ? DateUtil.formatDateToOData(oFiltros.dataFim!) : "",
            Branch: oFiltros.filiais.map((f: any) => f.key).join(","),
            CargaInicial: oFiltros.cargaInicial ? "true" : "false"
        };
    }

    /**
     * Obtém os filtros padrão
     * @returns Filtros padrão vazios
     */
    public getDefaultFilters(): IFiltros {
        return {
            dataInicio: null,
            dataFim: null,
            filiais: [],
            cargaInicial: false
        };
    }

    /**
     * Verifica se os filtros estão vazios
     * @param oFiltros - Filtros a verificar
     * @returns true se vazios, false caso contrário
     */
    public isEmpty(oFiltros: IFiltros): boolean {
        return (
            !oFiltros.dataInicio &&
            !oFiltros.dataFim &&
            (!oFiltros.filiais || oFiltros.filiais.length === 0) &&
            !oFiltros.cargaInicial
        );
    }

    /**
     * Cria uma cópia dos filtros
     * @param oFiltros - Filtros a copiar
     * @returns Cópia dos filtros
     */
    public cloneFilters(oFiltros: IFiltros): IFiltros {
        return {
            dataInicio: oFiltros.dataInicio ? new Date(oFiltros.dataInicio) : null,
            dataFim: oFiltros.dataFim ? new Date(oFiltros.dataFim) : null,
            filiais: Array.isArray(oFiltros.filiais) ? [...oFiltros.filiais] : [],
            cargaInicial: oFiltros.cargaInicial
        };
    }

    /**
     * Limpa os filtros
     * @returns Filtros vazios
     */
    public clearFilters(): IFiltros {
        return this.getDefaultFilters();
    }

    /**
     * Obtém a descrição dos filtros para exibição
     * @param oFiltros - Filtros
     * @returns String descrevendo os filtros
     */
    public getFilterDescription(oFiltros: IFiltros): string {
        const aParts: string[] = [];

        if (oFiltros.dataInicio && oFiltros.dataFim) {
            aParts.push(`Período: ${DateUtil.formatDateToBR(oFiltros.dataInicio)} a ${DateUtil.formatDateToBR(oFiltros.dataFim)}`);
        }

        if (oFiltros.filiais && oFiltros.filiais.length > 0) {
            const sFiliais = oFiltros.filiais.map((f: any) => f.key).join(", ");
            aParts.push(`Filiais: ${sFiliais}`);
        }

        if (oFiltros.cargaInicial) {
            aParts.push("Carga Inicial: Sim");
        }

        return aParts.length > 0 ? aParts.join(" | ") : "Nenhum filtro aplicado";
    }

    /**
     * Valida se há pelo menos um filtro preenchido
     * @param oFiltros - Filtros a validar
     * @returns true se tem pelo menos um filtro, false caso contrário
     */
    public hasAtLeastOneFilter(oFiltros: IFiltros): boolean {
        return !this.isEmpty(oFiltros);
    }

    /**
     * Obtém o número de dias do período
     * @param oFiltros - Filtros com período
     * @returns Número de dias ou 0
     */
    public getPeriodDays(oFiltros: IFiltros): number {
        if (!oFiltros.dataInicio || !oFiltros.dataFim) {
            return 0;
        }
        return DateUtil.getDaysDifference(oFiltros.dataInicio, oFiltros.dataFim);
    }

    /**
     * Verifica se o período é válido (não muito grande)
     * @param oFiltros - Filtros com período
     * @param iMaxDays - Número máximo de dias permitido (padrão: 365)
     * @returns true se válido, false caso contrário
     */
    public isPeriodValid(oFiltros: IFiltros, iMaxDays: number = 365): boolean {
        const iPeriodDays = this.getPeriodDays(oFiltros);
        return iPeriodDays <= iMaxDays;
    }
}