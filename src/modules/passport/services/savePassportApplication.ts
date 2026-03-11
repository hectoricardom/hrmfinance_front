
import { authStore } from '../../../stores/authStore';
import { CubanPassportForm } from '../types/cubanPassport';
import { SavedPassportApplication } from './passportApplicationService';
import { fetchGraphQLSS, generateRandomId, devLog } from '../../../services/utils';

export interface SaveApplicationOptions {
  status?: 'draft' | 'submitted';
  applicationNumber?: string;
  processingNotes?: string;
  overwrite?: boolean;
}

/**
 * Save a passport application to the server
 */
export const savePassportApplication = async (
  applicationData: CubanPassportForm,
  options: SaveApplicationOptions = {}
): Promise<string> => {
  try {
    const currentUser = authStore.state.user;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const {
      status = 'draft',
      applicationNumber,
      processingNotes,
      overwrite = false
    } = options;

    // Generate application ID if not provided
    //const applicationsRef = collection(db, 'passportApplications');
    //const docRef = doc(applicationsRef);
    
    const now = new Date().getTime()
    const applicationId = generateRandomId();

    const saveData: Partial<SavedPassportApplication> = {
      applicationData,
      status,
      userId: currentUser.uid,
      createdAt: now,
      updatedAt: now,
      applicationNumber,
      processingNotes,
      id: generateRandomId()
    };

    // If generating application number automatically
    if (status === 'submitted' && !applicationNumber) {
      const timestamp = Date.now();
      const userInitials = `${applicationData.primerNombre?.[0] || 'X'}${applicationData.primerApellido?.[0] || 'X'}`;
      saveData.applicationNumber = `CUB-${userInitials}-${timestamp}`;
    }


      devLog(saveData);
      devLog(JSON.stringify(saveData, null, 4))
    // await setDoc(docRef, saveData);

    let  params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
     
    }

    
  
    

    let bdyq2 = {
      query: "addCubanPassport",
      params,
      form: saveData
    } 
  
     // const response = await fetchGraphQLSS(bdyq2);
      devLog(bdyq2);
     // return response;
    


    

    devLog('Passport application saved successfully:', applicationId);
    return applicationId;

  } catch (error) {
    devLog('Error saving passport application:', error);
    throw new Error(`Failed to save passport application: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Update an existing passport application
 */
export const updatePassportApplication = async (
  applicationId: string,
  applicationData: CubanPassportForm,
  options: SaveApplicationOptions = {}
): Promise<void> => {
  try {
    const currentUser = authStore.state.user;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const {
      status,
      applicationNumber,
      processingNotes
    } = options;


   

    //const docRef = doc(db, 'passportApplications', applicationId);
    
    const updateData: any = {
      applicationData,
      updatedAt: new Date().getTime()
    };

   

    // Only update fields that are provided
    if (status !== undefined) {
      updateData.status = status;
    }
    if (applicationNumber !== undefined) {
      updateData.applicationNumber = applicationNumber;
    }
    if (processingNotes !== undefined) {
      updateData.processingNotes = processingNotes;
    }



    // If submitting for the first time, generate application number
    if (status === 'submitted' && !applicationNumber) {
      const timestamp = Date.now();
      const userInitials = `${applicationData.primerNombre?.[0] || 'X'}${applicationData.primerApellido?.[0] || 'X'}`;
      updateData.applicationNumber = `CUB-${userInitials}-${timestamp}`;
      updateData.submissionDate = new Date().getTime()
    }


    devLog(updateData)
    //await updateDoc(docRef, updateData);


    let  params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id: updateData?.id
    }

    
  
    

    let bdyq2 = {
      query: "updateCubanPassport",
      params,
      form: updateData
    } 
  
     // const response = await fetchGraphQLSS(bdyq2);
      devLog(bdyq2);
     // return response;
    
    devLog('Passport application updated successfully:', applicationId);

  } catch (error) {
    devLog('Error updating passport application:', error);
    throw new Error(`Failed to update passport application: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};



/**
 * Update an existing passport application
 */
export const updatePassportApplicationPartial = async (
  applicationId: string,
  applicationData: any,
): Promise<void> => {

  try {
    const currentUser = authStore.state.user;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

 


   

    //const docRef = doc(db, 'passportApplications', applicationId);
    
    const updateData: any = {
      applicationData,
      updatedAt: new Date().getTime()
    };

   

    

    devLog(updateData)
    //await updateDoc(docRef, updateData);


    let  params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id: applicationId
    }

    
    

    let bdyq2 = {
      query: "updateCubanPassport",
      params,
      form: updateData
    } 
  
    const response = await fetchGraphQLSS(bdyq2);
    //devLog(bdyq2);
    return response;
    

  } catch (error) {
    devLog('Error updating passport application:', error);
    throw new Error(`Failed to update passport application: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};


/**
 * Auto-save application as draft (debounced)
 */
let autoSaveTimer: NodeJS.Timeout | null = null;

export const autoSaveApplication = (
  applicationData: CubanPassportForm,
  applicationId?: string,
  delay: number = 2000
) => {
  // Clear existing timer
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  // Set new timer
  autoSaveTimer = setTimeout(async () => {
    try {
      if (applicationId) {
        await updatePassportApplication(applicationId, applicationData, { status: 'draft' });
        devLog('Application auto-saved');
      } else {
        const newId = await savePassportApplication(applicationData, { status: 'draft' });
        devLog('New application auto-saved:', newId);
        // You might want to emit this ID back to the component
        return newId;
      }
    } catch (error) {
      devLog('Auto-save failed:', error);
    }
  }, delay);
};

/**
 * Cancel auto-save timer
 */
export const cancelAutoSave = () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
};








/**
 

{
    "applicationData": {
        "clasificacionMigratoria": "PSE",
        "sexo": "M",
        "colorPiel": "Blanca",
        "colorOjos": "Castaños",
        "colorCabello": "Castaño",
        "lugarNacimiento": {
            "pais": "UNITED STATES",
            "provincia": "SANTIAGO DE CUBA",
            "municipio": "SANTIAGO DE CUBA",
            "diaNacimiento": "19",
            "mesNacimiento": "2",
            "anoNacimiento": "1985"
        },
        "direccionActual": {
            "calle": "330 STARLET COURT",
            "provincia": "KY",
            "municipio": "FAIRDALE",
            "pais": "UNITED STATES",
            "codigoPostal": "40118"
        },
        "datosLaborales": {
            "ocupacion": "OBRERO",
            "profesion": "MECANICO",
            "nivelEscolar": "PRE-UNIVERSITARIO",
            "nombreCentroTrabajo": "WALMART",
            "direccionCentro": "175 OUTERLOOP ",
            "telefonoCentro": ""
        },
        "referenciaEnCuba": {
            "nombre": "ALINA PRADO",
            "parentesco": "",
            "direccion": "GRABD ASND AMAISJD ASLJD A,SD ASKASD ASDKAS ADK"
        },
        "certificadoNacimiento": {
            "tomo": "38",
            "folio": "78",
            "registroCivil": "SONGO LA MAYA"
        },
        "primerApellido": "JODNASDJ",
        "segundoApellido": "JSADNDN",
        "primerNombre": "NKJASDA",
        "segundoNombre": "JNJN",
        "nombre": "JNJN",
        "padre": "JN",
        "estatura": "176",
        "telefono": "5023231345",
        "email": "nshdgvau@gmail.com",
        "pasaporteAnterior": {
            "numero": "K582932",
            "fechaExpedicion": "2025-04-15",
            "lugar": "LA HABANA"
        },
        "firmaBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFcAAABSCAYAAAAhBUjfAAAQAElEQVR4AeybCVhUZdvHz4EZBsJdE0GZGXZRy9z30resy7LMSkpbNItEzbVFLXPjde9T08yyV818Wy61bLm0vbTUVFxQK2OQZQA3NCXLgJmB8/3uSfgAFQeECfjwOg8zZ+ac5zzP/7nv//2/72f0UGr/VRoCteBWGrSKUgtuLbhlQkCdPn26R9HG3erFxov7jppkuWrv3r11/fv3Dz169Ghri8XS5qeffmojr8OHDw/ncx/3wfr3k2oKuGq/fv28PD0929WvX3+Fj4/PBoPBsN5ut6/39fXdoNfr1+bl5XUdNGiQl1g0UxdL5qVyjxoBLqDpVVXt0qxZs5U7d+7stW7duvBdu3aFHTlyJPTtt98Oe+eddzryXSxQdk5MTAyRheB9pQNc7cHVNE39888/6wcGBk779ttvb0xLS9N37drVsXLlytRZs2YlRUZG5thsNnXz5s0dw8PD1zVu3HhlnTp12o8ZM8arsgGuzuBK4NJNnDgxpG7dupFr1qwJ9Pf3V1u3bp370ksvHYAGnmjUqNGQjRs3bv3mm28S27Rp41iwYIHpiy++6AHAr7IgPcTiKxPg6gyusnfv3rpNmjRZ0qlTp1XQgt/s2bMtixYt2oY1x2RnZ//4+++/x2dmZo4EwKGjRo3a3adPH3tKSoonYN+I9cbSOk6YMMGb7yuFIqoluIAnVmsIDg4Omzt3bviUKVOCGzZseGr79u3DcnNzR9x2222H7rzzztyoqKi8Hj16WE+cOLEXsKeiGvZ36dIlF4A9fvjhh05Y8KJz586ZALdSjmoJ7syZM/U5OTmdAfQ/119/vQk14MBq0wDLAqhpWHFeUbQE5L/++isO+hgZExOzG2u3/frrr7r333+/xZYtWwxcW2u5gOA80tPT6yC7psGfrXmvDw0N/R1Xnw8NnAdYzXlRiT8jRoywX7hw4TCBLbZevXpndDqdcvLkSc8bb7yxGfJMgluJO679tNpZLoFLODJ09erVpri4OA/AsY0ePToJirBi0Y7SIBELbtGihRWgk81mc463t3djaON5aKOpUE1p95bnu2oFLham++OPP7p07dr1DX9/f6NM+PTp01b4cywgW+X8as3X1zcdKpgMLViRaDrem/gs6K233hJ6uNrtZfq+2oB70bLqwLPT5s2bdwNprR5qcMCh1gYNGiRjlTZXZj5jxgwbFJKBVMsFXLnFyL+5WVlZQZxUKPdWG3DhUmXVqlUe6NqmRHsnCM2bN/9j69at80lzzwOMy0erVq1EDyukyMr+/ft1WG3AK6+88v/TcsVqEfxOQzhz5ozCuQJn5t53332JBKc0srFSubYk6j179rT36tXrBBZvI7NTUB4allvysms+dw74mnup5A727dunGz9+vHnhwoVhCH+Dh4eHAsjpVL1GBQQEpPF4jVaW4wwWuwCNewaP0NDACrxblvtdurZagAu/1kebLgPYd9u3b29s27Ztft++fdPgzKRly5a5xLVF0RBL//nnn086HA77qVOnNKpoRb+usPfVAVyVWoHHkCFDWqAWgsjCNLj2EMBOJ4H4AyTKarXcoihUxlQyOwXVoYrmdX5YwX+qHLjwqXqxefDqQfAyPPXUU+bDhw97Hzx4UL5L/+2332L4Lm7Dhg155cUDcJX7779fYYGcHF7efkq7r8qB++OPP3qfPn06lOyp5dmzZ1viujfffvvtKwlAJgKREhQUlHPo0KFUgC0zHRQFYs6cOQq1BoUFU3iGgicU/bpC3lc5cIncRoLL2/Drx9ddd90mZrmSjOqG7777Tk+y4MCNT5Fl5fP5NR1sBWnx8fGKBDM4XWFBy0UvpQ2iyoCLm6uUEAVAM8ErjCJMMFIp9K677jIS2T2aNm2q3HTTTRdIVecCfpl0LcHLi8JNC7zBl8ULpXLWKjY2NoT014BaEL3r9eyzz5r5vDXjaHOZFsZnZd6DqzLgigWQ2ta/4YYbnmMidbFcG6ogBZfNFS1K5UvkV156enrmvn37yqRr6bsRicbzGRkZwbj/ItoGUuhX/Pz8GvOdymI1ueeeexYD7nqK6CXbhszMzNegIiPjciYv3OPSUWXAJS1Vn376ad2KFSv88vPzFcDcnZqaGoNlWUlVNV6LBp4yTXLkyJH6bt26mQliLfGKcKil5fz584OPHTvmhQxTsWav559/PohtoAg85pKG97QkYQliDFI9E8xcer5c6NIqVPZFVLQ03NeBOkgH3P0ogqm48kGAdQYuwFZIHjzJzPw6dOjgWZbxfP/998ovv/ziD6++DJhmuFxFfSgmk0mhXCkZmsKGZi60kYJVWy62BF6TabnQVdOkpKTpSLZu7C6buUdAvuoQqgy4jFQCShaBZjRU8AiF7cMhISFBgOoDqArZlArYdXDhyYBQj+tdPtgGEhD19NOCm5w1BEB2egJ9iZdokZGRGejnp6g33Ms1ztasWbNoaMrauXNnTyiqHVa9pmXLlqu8vLw6EVSFg0u14KoELnNSHPxJpSVjXX5MdDk8FwhXKrfeequGNBPd60dRXCy31InRR+GxfPlyO9vrJ9G0Dvg7H+vXsOLCzAzQ7BSFrMi7hMmTJydyo4WWSFHI8vHHH1s2bdqUwP3pVOSaUYPoxrjmsMjOkifXXfGoauDKQMWCVSYhFhaUnJzshfXmdezY8Rhf5hOYDLilieaSa3KPguX+FhYWFgvl7N25c2cCvJ6EJebKdyyeAgWdZgHm4/Kn4X55vkI2qEJJZ+DnsXjRfe++++7TiYmJJ2l6FjmABa92livzVdge11Fj9ZOdBmq2CkBkHzlyZA1cnI2VmSIiIl7jc7PzYhf+EIjsWF0cr4/g0gO2bds2HM5NAVgN4BQWzGnZPNfOFryewruZ7SDzY489phHITvTv39/GDojC851Poy+FsqXzfWl/qqLlKgAgP/KYBEfWJTPLWbBgQSbKYQhg+CDXvOBl2ZQUyy5tbsW+A1ibt7d3KrvFSS+++GIqkstGf4pwL4HKC24N4lmRKIZb2D1eGxgY+B/23LoDZC8k2xoAX8GC+kNPdoA+htrI5n6nlRd7UJGTKgluQkKC/sCBA36M0xO9K1w4DkuzyzmBxxYbGysgZXNepgOANVSDDpUQCKDeWKzzfhazCeAtouK2nj21JUivgOPHj7d75JFH3oTfXyc77AKdmAhiHs8999xebnqBNNwq/fH+ikd5wVXpURovFX6IKtCo14oF5yPuU6jbHoXncpmMJBJWgB6Fq7q0Z1ZydJQYTe3atZsP7ZixPFVcHbnlBZc2v+OOO3zYmj/OcyZ99NFHuwFa5frmWLcHO83WPXv27CbQTmEx4gA3p2TfJc/LBa78zuqhhx7y7927t66gw4p6lb7JnoxM0MCk//zqq6/eB4CmnPtgbQqBJ7devXry2wSn/i3LcwlSOlzbCOcGSQKBVyjIO6EGjQVLp9YwnKA3euPGjQdJucey1xYtG5ks7EnUwlhk29Dz58/vEW525bnlAVfFbQMY2Ex4qiPbL1eL2mLhBe2qYyIKm1AGS5mACc71xcqm/etf/1oDuAK4wkQV0lTp76p9lbhARXk0glMncX8TFk6FIpwVMQCTREIl2dBRHAqGCmYT0Dz79OmTSNUsEeATbrnllsQPPvggFcsWlVEq1xY8tzzgKjzMwEM7kkouInp3mjFjxuUAVgV4OCr4mWeeiWCbJkgshwdfCRiVuq2eiZnRlsFYkAFL1SGhgrGaYFzYQHPAlyfZ2rHTl9R7i/ZV9D2PKX4wRn1WVlbwp59+asJa9SyexiLmQz/5SD0NBRIA166g7yWDBw++HvmmiUSDe8dhsaPoLY0sskzVuHKBS2VKI+B4rV27tiODnAYnNeXhxQ4mr+KCTeCnZejHTbTXce+2MsliF148ATh5V5+IPYlCST0JNvIZi6harVYpkivcn/P555+/i3X7I+TDly5dGspzvGm6CRMmBMgrnVwOZJWCjxEv+B+klxEw88aOHZvKToRl9+7dFrjU8sYbb1jRznlkhcdQJFNRCClRUVE2xpPcvXv3o7wvcwAtF7hMQGOizF3LJ+tRGjVqxEfFDyzaaSlkPmGI9vAtW7b0YhGWAZxkNpcAgNurZEK6N998U1SCnoDjdFnORYdK53KPDynpS0z8A0D4iKDyHtbdnbF0IGOag7u3BfBLvEgWVMBdt25dcFpamheWe5oANZaCzb1Qw0BpcPBAFnQgicOT0N7ei+4vzy13KzO4aDwDbtMCzWhgoKeY/DwGlll0BEzQQH2ga1RU1GI40si1wtP6Dz/8MJB2RX3KpBV0pWybi5VKPUAhWisAr6A7Ze/MY968eWb21MIeffTRMPq/CbDfxBL/SzAaWLdu3dfQwybGIgvBy98H3zdECUyCchrB4yoLl4dHZFAoSgRIS0GjlGm5++67U1kMkX1/33wNf8sELqaqMkAT2y4zmFRzKMHOqp8oORgm2JQJTV2yZMlNZFd5TzzxRBrFbgkEVx0q1uPcHRCgkUeSCQmoDrg7Bd5OoKj9K8AmMRYb13rCg/JTpBAs0Xf16tVBX375pXfRh6xfv94L8IJZcBNj15OB2dnZyBg4cGA292q0/KKNhZRgJa1oN+V6XxZwVbaxvYim5tGjR5vQe+qDDz54jJUuucrqJ5984rVw4cIAgNe45kBWVtYS1EU6mjWddPKyIMOXMgHt3LlzGjwtikCBsx0DBgywTpo0KZ4+RuDG9+MFY7G+6byeIqEQC3dyMqA5yL5SyaBy6avQcgHWhNpYiEdIqTGP8e4hO5tAQiAFogoBUQZ+ueYyuDJgoqekf1MaNGjQkML2HvjpWaJrOh0XGyTpqQbH5WNd56CFz5n4EPL041jzGCz4kh9xUC+V6G0aOnRoCOAaAEKBSzWo5Xx8fPzTcOlg+tkB2OkEl/EUU2biNX4ssJMyWAx7VFTULjTpSIriUj4MIqvypulwfyMLHUwiooejzxK8ZnHdAQLaZReZuVTY4TK4WKFKQNATnPzQhadxs5mAewBKKCbmmZCByB3o6+trQKo1gBZGQA9NAWkOlneQRbIDulq0cU9DEoNlaMm1pKGBlANVgNUIinlIsuPsnXnixmATFEmKGr58+fIQ+NFAcFTI/xXGcQELXYt88sJDXoN717CLLNvxDfGcSfB2I4zADu8mM6Y0ii5S2qwwEK/UkUvgMnnvIUOGmJElQQQBPROyAfYJuKrYIAUwZJIJgGYDqhFX9kLj+nNtPvryJC6pfv3110Fbt26NKGg7duwIZwc2Ak4No78QhL43Vq8Ahvr44497cn97lME6FMkGQFyHNjVihSo1WbFaDWvWsPLr4OEpSKg1BLvu48aNiwDQUBYpnH6N0IAolwwk3bNIQtGrxTztSuBc6+eugKtCBwHIn1dJeV9ni6V5y5YtVSyk2LMFWKxJx0aeCc1oxnIkfVUA2D516tQM3NWGpmwMNbwKZ24qaOjVj7DMNXa73QggKtaqkP7Kb7dUZ12LhwAABrhJREFUqlP1SCJmQQHtH3jggVYvv/yy/P8yb4DP5xprv379LNHR0Vbu8WAhQnluBDTgg0U3xNKXsoPwFjRjgkbyoCUr8zi6ePFioYOKB7cYGn+fuAKuAk8ZiMYmrMAse/xM+DjWWYwOUAgG3L4DgEzD+pxJBa6uPfzwwydw0xXQhx7LCh8+fHgoQITTIqQx6Qiq/8FkQt6IeOFahQWSPS9l4sSJOnjYn1TVA8CkqC0/CrEToA5jxdFQx73IwWhqHId4ho19LrFmoQodCsU8bdq0EIzC4+abbz7Iws1ioc8ybbcAy3Nc+1/rgKngjgpcK4WONNxyGvtNEsikD9mLUg8cOGAklXwZRdEJC3EWdOBdlbKdH3Qyk+CzHkuS/SfhVA9SSsmaxCuk0iW8Kfm9ggs7CymoAQ1AHET/5CeffPJXVMMR7j/Ss2fPbejq4VjkD1ikRV45j8a6t7HgiXhVjgREoS5ATeL673nWaKTjLjxLaKxqgUuWpSCHVAYpETwbyzzOfpNNkBU6QB14UUESyw7+7LPPnNkVUkfDUrWYmBhvAA4dPHhwJJYYQupsYLE0vs8nn3cQ/VOghRTOc+BrSSJyWMhkrNHSt2/feCx6JEANIgsbBL8OAswY2k88JxeOzpdXvjuEFcfQHqUws4OCSwKg7mBcQ1EZMfQbz6K7jQ4EF2ku0QIg2aVgAj86AFPuc1qrSCistRmBIxAXn4zwb4I12YKCglKIyBYKIamAY2dRFBZExW1VLNiGC6dwzVEA3c890QSwxwk2ItHyiOZxWOzD3DcApTAYGvqeGsbP0t57772fqbMmYYHFtDXB0UHml4xaiBMrBsyB0FQ0z9rN9ckEYachOAfuxj+ugKtRP8hAG84lqmcCsAGOlJ/+hKFZu8F9M4j411OHzcYdk9G0P2BJQ2n3MsFHu3Tpsp3PUglCNqPRKDuuqfDn4yzSAPTpw4C3EzCT+T4H1z3HIsxk/vvpM5GgmIT1icXx0dUPsWTiQyr3WVj4FLxLfgXpNhooOUJXwFWwDBugpqIxU6nhBpBpvQFAm2ireN9h0aJF57C0MQS0+7DOEVjyHtSBBYuP4zwa1xyKBJKkQxYgFaVgIU21kMklsQBO8OhfAlEeVn4SyxRuzGew5QFG7invvTyy4g6XwOVxGoEmHTedQvtp3LhxRtLYCPhUfiT3G1H4T9w6FSs7Qj0gRdxQrEhe5dxms+3BXf9NgEsj2/ovYMsP6QoAEDB4hCJUU/je+UE1/+MyuPBYjlgkxY8XcLk4rCsZhbCH+c8SuuBVgClonBYeGqDboYnj3C9y7HaC2nWF39bgN66CKxAIcHYi8h64chjJwAD4dhjne/myWIDh/JIDjpVn/YXE+oJAduGSC2rgBzLhskxLAM7BtZNw9QRuTKYJZ8rnvC31kGvqEcGfRCO3QpcWFLVVLB/sNfmdbKkdVLcvywquzE9AklbAmfKZSw0EddBKFyx/Ca+yI6EAsp5MLhAuN0AbLvVTXS4qD7jlnhtUIvVXA5xrIgg6i9pQixkVshi1gJQ2ebDjUFiLLfeDrnSjmz93G7iAqWRmZipkV5Lq5kMrau/evXUkEca4uLggJJ5CYcZKeVJoxs0wVM7j3AYuGZkSHBzstEq2UpyzgRoakmRMAuD6UEIaicoYagOSqQntOK+pzn/cAi5cqy1YsCCXHYF03N5OLVYlqEnhRk9Nwp8gp1IuTCNLO0pl7B9JVStjEd0CLpaqEbSs27dvf4ZEIoXS5TFSaBsWKz/FF6o4Cx3MJ33+Xa6tjIn+E326BVyZmKTQ7CYkx8bGbvfx8RlHpcsKuBplTA26cLBDcYpqlkOurSnNbeBSLJctmbMohpkEtoMUxDV2NoyoBIPsarATUVMwLZyH28AVd5cdVxTCMWoO+WzNdCTILaMSFkhS4vxPfIWjqiFv3AZuAV4UdPSkwG2x1tkEs/ZUy1Q2ITPYlqkxEqxgrm4HF+VgRiks3bx5c+f9+/d7UM+1si0+Hku2Fgyqpry6G1z5NY4Pu8FG+RkqsitfEgekWDKUUWMkWIFxuBtcpUePHrlsCWWwS5w9bNiwQ9R2/81gsmg1InFgHoWHu8GVX9GkXrhwYXxkZOSHZGUj2L3YhZL4P6stHFr1f+NucBWARBzkxlM8f4FtoHjOr1oLrq4wux1ckWRsc9vYd8tYuXKlAFvj6KDAGNwO7sUHC6DSLp7WzJd/CtyaiWaJWdWCWwKQijytBbci0SzRVy24JQCpyNNacCsSzRJ91YJbApCKPK0FtyLRLNFXLbglAKnI0/8FAAD//9Sz9BgAAAAGSURBVAMAr+VxWSjQ0ZEAAAAASUVORK5CYII="
    },
    "status": "submitted",
    "userId": "m80Mu9L6KKatr60hlHWTyp9M91Q2",
    "createdAt": 1756394470691,
    "updatedAt": 1756394470691,
    "applicationNumber": "CUB-NJ-1756394470691"
}

 */