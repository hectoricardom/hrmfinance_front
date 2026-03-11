import{e as n,P as a}from"./index-Dqwppiiq.js";let s=0;const c=()=>(s+=1,s);class m{AVERAGE_PROCESSING_MINUTES=35;async checkInClient(e,t){try{n("CheckInService: checking in client",e);const i=await a({query:`mutation CheckInClient($clientId: String!, $notes: String) {
          checkInClient(clientId: $clientId, notes: $notes) {
            id
            queueNumber
            clientId
            clientName
            phone
            email
            checkInTime
            status
            estimatedWaitMinutes
            hasPreVisitForm
            isWalkIn
            appointmentId
            notes
          }
        }`,params:{clientId:e,notes:t}});return i?.data?.checkInClient?i.data.checkInClient:this.createLocalEntry({clientId:e,clientName:"Client "+e,phone:"",isWalkIn:!1,notes:t})}catch(i){throw n("CheckInService: error checking in client",i),i}}async checkInWalkIn(e,t,i){try{n("CheckInService: checking in walk-in",e,t);const r=await a({query:`mutation CheckInWalkIn($name: String!, $phone: String!, $serviceType: String) {
          checkInWalkIn(name: $name, phone: $phone, serviceType: $serviceType) {
            id
            queueNumber
            clientId
            clientName
            phone
            checkInTime
            status
            estimatedWaitMinutes
            isWalkIn
            serviceType
          }
        }`,params:{name:e,phone:t,serviceType:i}});return r?.data?.checkInWalkIn?r.data.checkInWalkIn:this.createLocalEntry({clientName:e,phone:t,isWalkIn:!0,serviceType:i})}catch(r){throw n("CheckInService: error checking in walk-in",r),r}}async submitPreVisitForm(e,t,i){try{n("CheckInService: submitting pre-visit form",e);const r=await a({query:`mutation SubmitPreVisitForm($portalId: String!, $token: String!, $formData: PreVisitFormInput!) {
          submitPreVisitForm(portalId: $portalId, token: $token, formData: $formData) {
            success
            queuePosition
            estimatedWaitMinutes
            entryId
          }
        }`,params:{portalId:e,token:t,formData:i}});return r?.data?.submitPreVisitForm?r.data.submitPreVisitForm:{success:!0,queuePosition:c(),estimatedWaitMinutes:this.AVERAGE_PROCESSING_MINUTES}}catch(r){throw n("CheckInService: error submitting pre-visit form",r),r}}async getWaitingList(){try{n("CheckInService: fetching waiting list");const e=await a({query:`query GetWaitingList {
          getWaitingList {
            id
            queueNumber
            clientId
            clientName
            phone
            email
            checkInTime
            status
            serviceType
            notes
            assignedPreparerId
            assignedPreparerName
            estimatedWaitMinutes
            startedAt
            completedAt
            hasPreVisitForm
            isWalkIn
            appointmentId
          }
        }`});return e?.data?.getWaitingList?e.data.getWaitingList.sort((i,r)=>i.checkInTime-r.checkInTime):[]}catch(e){throw n("CheckInService: error fetching waiting list",e),e}}async callNextClient(){try{n("CheckInService: calling next client");const e=await a({query:`mutation CallNextClient {
          callNextClient {
            id
            queueNumber
            clientName
            phone
            status
            assignedPreparerId
            assignedPreparerName
          }
        }`});return e?.data?.callNextClient?e.data.callNextClient:null}catch(e){throw n("CheckInService: error calling next client",e),e}}async markInProgress(e,t,i){try{n("CheckInService: marking in progress",e,t);const r=await a({query:`mutation MarkInProgress($entryId: String!, $preparerId: String!, $preparerName: String) {
          markInProgress(entryId: $entryId, preparerId: $preparerId, preparerName: $preparerName) {
            id
            status
            assignedPreparerId
            assignedPreparerName
            startedAt
          }
        }`,params:{entryId:e,preparerId:t,preparerName:i}});if(r?.data?.markInProgress)return r.data.markInProgress;throw new Error("Failed to mark entry as in progress")}catch(r){throw n("CheckInService: error marking in progress",r),r}}async markCompleted(e){try{n("CheckInService: marking completed",e);const t=await a({query:`mutation MarkCompleted($entryId: String!) {
          markCompleted(entryId: $entryId) {
            id
            status
            completedAt
          }
        }`,params:{entryId:e}});if(t?.data?.markCompleted)return t.data.markCompleted;throw new Error("Failed to mark entry as completed")}catch(t){throw n("CheckInService: error marking completed",t),t}}async markNoShow(e){try{n("CheckInService: marking no-show",e);const t=await a({query:`mutation MarkNoShow($entryId: String!) {
          markNoShow(entryId: $entryId) {
            id
            status
            completedAt
          }
        }`,params:{entryId:e}});if(t?.data?.markNoShow)return t.data.markNoShow;throw new Error("Failed to mark entry as no-show")}catch(t){throw n("CheckInService: error marking no-show",t),t}}async estimateWaitTime(){try{const e=await a({query:`query EstimateWaitTime {
          estimateWaitTime {
            estimatedMinutes
            queuePosition
            activePreparers
            averageProcessingMinutes
            confidence
          }
        }`});return e?.data?.estimateWaitTime?e.data.estimateWaitTime:this.calculateLocalWaitEstimate(0,1)}catch(e){return n("CheckInService: error estimating wait time",e),this.calculateLocalWaitEstimate(0,1)}}async getAverageProcessingTime(){try{const e=await a({query:`query GetAverageProcessingTime {
          getAverageProcessingTime {
            averageMinutes
            sampleSize
          }
        }`});return e?.data?.getAverageProcessingTime?e.data.getAverageProcessingTime.averageMinutes:this.AVERAGE_PROCESSING_MINUTES}catch(e){return n("CheckInService: error getting average processing time",e),this.AVERAGE_PROCESSING_MINUTES}}async lookupAppointmentByPhone(e){try{n("CheckInService: looking up appointment by phone",e);const t=await a({query:`query LookupAppointmentByPhone($phone: String!) {
          lookupAppointmentByPhone(phone: $phone) {
            found
            appointmentId
            clientName
            scheduledTime
            serviceType
          }
        }`,params:{phone:e}});return t?.data?.lookupAppointmentByPhone?t.data.lookupAppointmentByPhone:{found:!1}}catch(t){return n("CheckInService: error looking up appointment",t),{found:!1}}}async getTodayAppointments(){try{const e=await a({query:`query GetTodayAppointments {
          getTodayAppointments {
            id
            clientName
            scheduledTime
            serviceType
            status
            phone
          }
        }`});return e?.data?.getTodayAppointments?e.data.getTodayAppointments:[]}catch(e){return n("CheckInService: error getting today appointments",e),[]}}async getMissingDocumentAlerts(){try{const e=await a({query:`query GetMissingDocumentAlerts {
          getMissingDocumentAlerts {
            clientId
            clientName
            missingDocuments
            daysWaiting
          }
        }`});return e?.data?.getMissingDocumentAlerts?e.data.getMissingDocumentAlerts:[]}catch(e){return n("CheckInService: error getting missing document alerts",e),[]}}createLocalEntry(e){const t=c(),i=Date.now();return{id:`local_${i}_${t}`,queueNumber:t,clientId:e.clientId,clientName:e.clientName,phone:e.phone,checkInTime:i,status:"waiting",serviceType:e.serviceType,notes:e.notes,estimatedWaitMinutes:this.AVERAGE_PROCESSING_MINUTES,hasPreVisitForm:!!e.preVisitData,preVisitData:e.preVisitData,isWalkIn:e.isWalkIn}}calculateLocalWaitEstimate(e,t){const i=this.AVERAGE_PROCESSING_MINUTES,r=Math.max(t,1);return{estimatedMinutes:Math.ceil(e*i/r),queuePosition:e,activePreparers:r,averageProcessingMinutes:i,confidence:e<=3?"high":e<=6?"medium":"low"}}}const h=new m;export{h as c};
