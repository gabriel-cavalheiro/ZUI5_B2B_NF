/**
 * Serviço para gerenciamento de variantes
 * @namespace br.com.inbetta.zui5b2bnf.service
 */

import JSONModel from "sap/ui/model/json/JSONModel";
import { IFiltros, IVariant, IVariantsModel } from "../model/Types";

/**
 * Serviço responsável por gerenciar variantes de filtros
 * Responsabilidades:
 * - Carregar variantes do storage
 * - Salvar variantes no storage
 * - Aplicar variantes
 * - Gerenciar ciclo de vida de variantes
 */
export class VariantService {
    private static readonly STORAGE_KEY = "zui5b2bnf.variants";
    private static readonly MAX_VARIANTS = 10;
    private static readonly MAX_STORAGE_SIZE = 50000; // 50KB

    private oVariantsModel: JSONModel;

    /**
     * Construtor do serviço
     * @param oVariantsModel - Modelo de variantes
     */
    constructor(oVariantsModel: JSONModel) {
        this.oVariantsModel = oVariantsModel;
    }

    /**
     * Carrega variantes do storage
     * @returns Dados de variantes carregadas
     */
    public loadVariants(): IVariantsModel {
        const oData: IVariantsModel = {
            items: [],
            defaultKey: "",
            currentKey: ""
        };

        try {
            const sRaw = window.sessionStorage.getItem(VariantService.STORAGE_KEY);
            if (sRaw) {
                const oParsed = JSON.parse(sRaw);
                if (oParsed && typeof oParsed === "object") {
                    oData.items = Array.isArray(oParsed.items) ? oParsed.items : [];
                    oData.defaultKey = oParsed.defaultKey || "";
                    oData.currentKey = oParsed.currentKey || oParsed.defaultKey || "";
                }
            }
        } catch (e) {
            console.warn("Erro ao carregar variantes:", e);
        }

        this.oVariantsModel.setData(oData);
        return oData;
    }

    /**
     * Salva variantes no storage
     * @returns true se salvo com sucesso, false caso contrário
     */
    public saveVariants(): boolean {
        try {
            const oData = this.oVariantsModel.getData() as IVariantsModel;

            // Limitar número de variantes
            if (oData.items && oData.items.length > VariantService.MAX_VARIANTS) {
                console.warn(`Limitando variantes a ${VariantService.MAX_VARIANTS}`);
                oData.items = oData.items.slice(0, VariantService.MAX_VARIANTS);
            }

            const sJson = JSON.stringify(oData);

            // Verificar tamanho
            if (sJson.length > VariantService.MAX_STORAGE_SIZE) {
                console.warn("Variantes muito grandes, limpando antigas");
                oData.items = [];
                this.oVariantsModel.setProperty("/items", []);
            }

            window.sessionStorage.setItem(VariantService.STORAGE_KEY, sJson);
            return true;
        } catch (e) {
            console.error("Erro ao salvar variantes:", e);
            try {
                window.sessionStorage.removeItem(VariantService.STORAGE_KEY);
            } catch (e2) {
                console.error("Erro ao limpar variantes:", e2);
            }
            return false;
        }
    }

    /**
     * Obtém uma variante pelo key
     * @param sKey - Chave da variante
     * @returns Variante encontrada ou null
     */
    public getVariantByKey(sKey: string): IVariant | null {
        if (!sKey) {
            return null;
        }

        const aItems = (this.oVariantsModel.getProperty("/items") || []) as IVariant[];
        for (let i = 0; i < aItems.length; i++) {
            if (aItems[i].key === sKey) {
                return aItems[i];
            }
        }

        return null;
    }

    /**
     * Coleta os filtros atuais para criar uma variante
     * @param oFiltros - Filtros atuais
     * @returns Cópia dos filtros para armazenamento
     */
    public collectFiltersForVariant(oFiltros: IFiltros): IFiltros {
        return {
            dataInicio: oFiltros.dataInicio ? new Date(oFiltros.dataInicio) : null,
            dataFim: oFiltros.dataFim ? new Date(oFiltros.dataFim) : null,
            filiais: Array.isArray(oFiltros.filiais) ? [...oFiltros.filiais] : [],
            cargaInicial: !!oFiltros.cargaInicial
        };
    }

    /**
     * Normaliza filtros carregados de uma variante
     * @param oFilters - Filtros a normalizar
     * @returns Filtros normalizados
     */
    public normalizeFiltersFromVariant(oFilters: any): IFiltros {
        const oDefault = this.getDefaultFilters();
        if (!oFilters || typeof oFilters !== "object") {
            return oDefault;
        }

        let oResult: IFiltros = {
            dataInicio: oDefault.dataInicio,
            dataFim: oDefault.dataFim,
            filiais: Array.isArray(oFilters.filiais) ? oFilters.filiais : [],
            cargaInicial: !!oFilters.cargaInicial
        };

        if (oFilters.dataInicio) {
            try {
                oResult.dataInicio = new Date(oFilters.dataInicio);
            } catch (e) {
                oResult.dataInicio = null;
            }
        }

        if (oFilters.dataFim) {
            try {
                oResult.dataFim = new Date(oFilters.dataFim);
            } catch (e) {
                oResult.dataFim = null;
            }
        }

        return oResult;
    }

    /**
     * Aplica uma variante pelos filtros
     * @param sKey - Chave da variante
     * @returns Filtros da variante ou null
     */
    public applyVariantByKey(sKey: string): IFiltros | null {
        if (!sKey) {
            return null;
        }

        const oVariant = this.getVariantByKey(sKey);
        if (!oVariant || !oVariant.content) {
            return null;
        }

        return this.normalizeFiltersFromVariant(oVariant.content);
    }

    /**
     * Define a seleção da variante
     * @param sKey - Chave da variante
     */
    public setVariantSelection(sKey: string): void {
        this.oVariantsModel.setProperty("/currentKey", sKey);
    }

    /**
     * Salva uma nova variante ou atualiza uma existente
     * @param sName - Nome da variante
     * @param bOverwrite - Se deve sobrescrever variante existente
     * @param sKey - Chave da variante (para sobrescrever)
     * @param bDefault - Se deve ser a variante padrão
     * @param oContent - Conteúdo (filtros) da variante
     * @returns Chave da variante salva
     */
    public saveVariant(
        sName: string,
        bOverwrite: boolean,
        sKey: string,
        bDefault: boolean,
        oContent: IFiltros
    ): string {
        const aItems = (this.oVariantsModel.getProperty("/items") || []) as IVariant[];
        let oVariant: IVariant | null = null;
        let sResultKey = sKey;

        if (bOverwrite && sKey) {
            oVariant = this.getVariantByKey(sKey);
        }

        if (oVariant) {
            oVariant.name = sName;
            oVariant.content = oContent;
        } else {
            sResultKey = "VAR_" + Date.now();
            oVariant = {
                key: sResultKey,
                name: sName,
                content: oContent
            };
            aItems.push(oVariant);
        }

        if (bDefault) {
            this.oVariantsModel.setProperty("/defaultKey", sResultKey);
        }

        this.oVariantsModel.setProperty("/items", aItems);
        this.oVariantsModel.setProperty("/currentKey", sResultKey);
        this.saveVariants();

        return sResultKey;
    }

    /**
     * Gerencia variantes (renomear, deletar, etc)
     * @param aRenamed - Array de variantes renomeadas
     * @param aDeleted - Array de chaves deletadas
     * @param sDefaultKey - Nova chave padrão
     */
    public manageVariants(aRenamed: any[], aDeleted: string[], sDefaultKey: string): void {
        let aItems = (this.oVariantsModel.getProperty("/items") || []) as IVariant[];
        let sCurrentKey = (this.oVariantsModel.getProperty("/currentKey") || "") as string;

        // Renomear variantes
        aRenamed.forEach((oRename: any) => {
            for (let i = 0; i < aItems.length; i++) {
                if (aItems[i].key === oRename.key) {
                    aItems[i].name = oRename.name;
                    break;
                }
            }
        });

        // Deletar variantes
        if (aDeleted.length > 0) {
            aItems = aItems.filter((oItem) => aDeleted.indexOf(oItem.key) === -1);
        }

        // Se a variante atual foi deletada, usar a padrão
        if (aDeleted.indexOf(sCurrentKey) !== -1) {
            sCurrentKey = sDefaultKey || "";
        }

        // Validar chave padrão
        if (sDefaultKey && aItems.every((oItem) => oItem.key !== sDefaultKey)) {
            sDefaultKey = "";
        }

        this.oVariantsModel.setProperty("/items", aItems);
        this.oVariantsModel.setProperty("/defaultKey", sDefaultKey);
        this.oVariantsModel.setProperty("/currentKey", sCurrentKey);
        this.saveVariants();
    }

    /**
     * Obtém os filtros padrão
     * @returns Filtros padrão vazios
     */
    private getDefaultFilters(): IFiltros {
        return {
            dataInicio: null,
            dataFim: null,
            filiais: [],
            cargaInicial: false
        };
    }

    /**
     * Limpa todas as variantes
     */
    public clearVariants(): void {
        try {
            window.sessionStorage.removeItem(VariantService.STORAGE_KEY);
            this.oVariantsModel.setData({
                items: [],
                defaultKey: "",
                currentKey: ""
            } as IVariantsModel);
        } catch (e) {
            console.error("Erro ao limpar variantes:", e);
        }
    }
}