import { BrowserContext } from "playwright";
import { ServiApiResponse } from "./mapper"

async function getInternalId(context: BrowserContext, refId: string): Promise<string | null> {
  const cookies = await context.cookies();
  const zccpn = cookies.find(cookie => cookie.name === "zccpn")?.value ?? "";
  const response = await context.request.post(
    "https://empresaservitractor.zohocreatorportal.com/digital_servitractor/modulo-empresarial-servitractor/form/Busqueda/add",
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
      },
      form: {
        Section: "",
        Busqueda: refId,
        Listado: "-Select-",
        formid: "4797307000000673001",
        zccpn,
        recType: "1",
        formAccessType: "1"
      },
    }
  );

  const data = await response.json();
  const jsSnipped = data.find((d: any) => Object.keys(d)[0]?.startsWith("generatedjs"));  
  const jsCode: string = jsSnipped ? Object.values(jsSnipped)[0] as string: "";

  const match = jsCode.match(/busqueda=(\d+)/);
  return match ? match[1] : null;
}

async function fetchResults(context: BrowserContext, internalId: string): Promise<ServiApiResponse> {
  const pageParameters = encodeURIComponent(JSON.stringify({ busqueda: internalId }));
  const url = `https://empresaservitractor.zohocreatorportal.com/digital_servitractor/modulo-empresarial-servitractor/report/Resultados_Busqueda?zc_EditBulkRec=false&zc_Export=false&zc_Footer=false&zc_Print=false&zc_EditRec=false&zc_BulkDuplicate=false&zc_DelRec=false&zc_AddRec=false&zc_DuplRec=false&zc_RetainChanges=false&zc_BulkDelete=false&zc_Search=false&pageId=4797307000002658131&elementId=report_1&pageParameters=${pageParameters}&zc_LoadIn=html`;

  const response = await context.request.get(url, {
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });

  return response.json();
}

export { getInternalId, fetchResults };