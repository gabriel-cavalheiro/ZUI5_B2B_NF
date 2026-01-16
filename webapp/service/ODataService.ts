/**
 * Serviço para operações com OData
 * @namespace br.com.inbetta.zui5b2bnf.service
 */

import JSONModel from "sap/ui/model/json/JSONModel";
import ODataModel from "sap/ui/model/odata/ODataModel";
import MessageBox from "sap/m/MessageBox";
import { IFilial, IProcessarPayload, IProcessarResponse, IODataError } from "../model/Types";

/**
 * Serviço responsável por operações com OData
 * Responsabilidades:
 * - Carregar dados de filiais
 * - Chamar função de processamento
 * - Tratar erros de OData
 */
export class ODataService {
    private oODataModel: ODataModel;
    private oHelpModel: JSONModel;

    /**
     * Construtor do serviço
     * @param oODataModel - Modelo OData
     * @param oHelpModel - Modelo de help (ValueHelp)
     */
    constructor(oODataModel: ODataModel, oHelpModel: JSONModel) {
        this.oODataModel = oODataModel;
        this.oHelpModel = oHelpModel;
    }

    /**
     * Carrega a lista de filiais do backend
     * @returns Promise que resolve com array de filiais
     * @throws Erro se falhar ao carregar
     */
    public async loadFiliais(): Promise<IFilial[]> {
        return new Promise((resolve, reject) => {
            if (!this.oODataModel) {
                const oError: IODataError = {
                    statusCode: 0,
                    statusText: "ODataModel não encontrado",
                    responseText: ""
                };
                console.error("ODataModel não encontrado");
                MessageBox.error("Erro ao carregar dados. ODataModel não disponível.");
                reject(oError);
                return;
            }

            this.oODataModel.read("/YpmtlBranchSet", {
                success: (oData: any) => {
                    console.log("Filiais carregadas com sucesso:", oData);
                    try {
                        const aFiliais = oData.results.map((oItem: any) => ({
                            key: oItem.Branch,
                            text: oItem.Name
                        }));
                        this.oHelpModel.setProperty("/filiais", aFiliais);
                        resolve(aFiliais);
                    } catch (e) {
                        reject(e);
                    }
                },
                error: (oError: any) => {
                    console.error("Erro ao carregar filiais:", oError);
                    const sErrorMsg = this._extractErrorMessage(oError);
                    MessageBox.error("Erro ao carregar a lista de filiais do backend: " + sErrorMsg);
                    reject(oError);
                }
            });
        });
    }

    /**
     * Chama a função de processamento de notas
     * @param oPayload - Payload com parâmetros de processamento
     * @returns Promise que resolve com resultado do processamento
     * @throws Erro se falhar
     */
    public async callFunctionImport(oPayload: IProcessarPayload): Promise<IProcessarResponse> {
        return new Promise((resolve, reject) => {
            if (!this.oODataModel) {
                const oError: IODataError = {
                    statusCode: 0,
                    statusText: "ODataModel não encontrado",
                    responseText: ""
                };
                reject(oError);
                return;
            }

            this.oODataModel.create("/ProcessarNotasSet", oPayload, {
                success: (oData: any ) => {
                    console.log("Sucesso na requisição:", oData);
                    try {
                        resolve(oData as IProcessarResponse);
                    } catch (e) {
                        reject(e);
                    }
                },
                error: (oError: any) => {
                    console.error("Erro na requisição:", oError);
                    reject(oError);
                }
            });
        });
    }

    /**
     * Extrai a mensagem de erro do OData
     * @param oError - Erro retornado pelo OData
     * @returns Mensagem de erro formatada
     */
    private _extractErrorMessage(oError: any): string {
        try {
            if (oError.responseText) {
                const oErrorResponse = JSON.parse(oError.responseText);
                if (oErrorResponse.error && oErrorResponse.error.message) {
                    return oErrorResponse.error.message.value || oErrorResponse.error.message;
                }
            }
        } catch (e) {
            // Ignorar erro de parse
        }

        if (oError.statusCode === 0) {
            return "Erro de conexão. Verifique sua conexão com o servidor.";
        }

        if (oError.statusText) {
            return oError.statusText;
        }

        return "Erro desconhecido ao processar a requisição.";
    }

    /**
     * Verifica se o ODataModel está disponível
     * @returns true se disponível, false caso contrário
     */
    public isODataModelAvailable(): boolean {
        return !!this.oODataModel;
    }

    /**
     * Obtém a lista de filiais do modelo
     * @returns Array de filiais
     */
    public getFiliais(): IFilial[] {
        const aFiliais = this.oHelpModel.getProperty("/filiais");
        return Array.isArray(aFiliais) ? aFiliais : [];
    }

    /**
     * Limpa a lista de filiais
     */
    public clearFiliais(): void {
        this.oHelpModel.setProperty("/filiais", []);
    }
}