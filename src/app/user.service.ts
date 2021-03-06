import { Injectable } from '@angular/core';
import { AngularFireAuthModule, AngularFireAuth} from 'angularfire2/auth';
import { AngularFireDatabaseModule, AngularFireDatabase, FirebaseListObservable, FirebaseObjectObservable } from 'angularfire2/database';
import { ImageManagementService } from './image-management.service';
import * as firebase from 'firebase/app';

@Injectable()
export class UserService {

  //path of firebase
  public diaries: FirebaseListObservable<any>;

  constructor(
    public afAuth: AngularFireAuth,
    public db: AngularFireDatabase,
    public ImageManagementService: ImageManagementService,
  ){ }


  //REGISTER to Firebase
  registerUser(email, password) {
    return firebase.auth().createUserWithEmailAndPassword(email, password);
  }

  saveUserInfoFromForm(uid: string, firstName: string, lastName: string, email: string) {
  return this.db.object('users/' + uid).set({
    firstName: firstName,
    lastName: lastName,
    email: email
  });
}


//User log in authentication
  login(email, password) {
    return firebase.auth().signInWithEmailAndPassword(email, password);
  }


//User log out authentication
  logout() {
    return firebase.auth().signOut();
  }




//READ
  getUserById(uid: string) {
    return this.db.object("users/" + uid);
  }

  getUser(uid: string) {
    return this.db.object('users/' + uid);
  }

  updatePassword(password){
    let user = firebase.auth().currentUser;
    let newPassword = password;

    return user.updatePassword(newPassword);
  }



  getUserIdBySearchKeyword(searchKeyword: string) {
    return this.db.list('/searchKeywords', {
      query: {
        orderByChild: 'searchKeyword',
        equalTo: searchKeyword
      }
    });
  }

  reauthenticate(credential){
    return firebase.auth().currentUser.reauthenticateWithCredential(credential);
  }

//CREATE
  makeDiary(good1, good2, good3, privacyLevel, userId, imgURL, imgFileName){
    let year = new Date().getUTCFullYear();
    let month = new Date().getUTCMonth() + 1;
    let imagePath = this.db.list('diaries/' + userId + '/allImages/').push( {imgFileName: imgFileName});

    imagePath.then((data) => {
      let imgFilePath = data.path.o[3];

      let diary = {
        date: Date.now(),
        good1: good1,
        good2: good2,
        good3: good3,
        privacyLevel: privacyLevel,
        imgURL: imgURL,
        imgFilePath: imgFilePath,
        imgFileName: imgFileName,
      }
      this.db.list('diaries/' + userId + '/year/' + year + '/' + month).push(diary);
    });
  }

  registerSearchKeyword(searchKeyword, userId){
    return this.db.list('searchKeywords').push({
      userId: userId,
      searchKeyword: searchKeyword
    });
  }



  getCredentials(email, password){
    return firebase.auth.EmailAuthProvider.credential(email, password);
  }

  //Used at past-diaries.component
  showMyAllDiaries(userId){
    return this.db.list('diaries/' + userId + '/year/');
  }



  //Used at past-diaries-year.component.ts
  getYearDiaries(userId, year){
    return this.db.list('diaries/' + userId + '/year/' + year);
  }

  //Used at past-diaries-year-month.component.ts
  getMonthlyDiaries(userId, year, month){
    return this.db.list('diaries/' + userId + '/year/' + year + '/' + month);
  }

  //Used at recent-diaries.component.ts
  getRecentDiaries(userId){
    let year = new Date().getUTCFullYear();
    let month = new Date().getUTCMonth() + 1;
    return this.db.list('diaries/' + userId + '/year/' + year + '/' + month, {
      query: {
        orderByChild: 'date',
        limitToLast: 3,
      }
    });
  }


  deleteDiary(userId, diary){
    let user = firebase.auth().currentUser;
    let year =  new Date(diary.date).getUTCFullYear();
    let month = new Date(diary.date).getUTCMonth() + 1;
    let query = this.db.list('/diaries/' + userId + '/year/' + year + '/' + month + '/' + diary.$key);

    query.subscribe((value) => {
      let imgFilePath = "";
      let imgFileName = "";

      //Get imgFilePath and imgFileName
      for (let key in value) {
        if(value[key].$key === "imgFilePath"){
          imgFilePath = value[key].$value;
        }

        if(value[key].$key === "imgFileName"){
          imgFileName = value[key].$value;
        }
      }

      //1: delete diary
      this.db.list('/diaries/' + userId + '/year/' + year + '/' + month + '/' + diary.$key).remove();

      //2: delete from allImages
      this.db.list('/diaries/' + userId + '/allImages/' + imgFilePath).remove();

      //3: delete from firebase storage
      if(imgFileName !== "none"){
        this.ImageManagementService.deleteImage(user.uid, imgFileName);
      }
    });
  }

  deleteAllDiary(userId){
      let p1 = this.db.list('users/' + userId).remove();
      let p2 = this.db.list('diaries/' + userId).remove();

      let allPromise = Promise.all([p1, p2]);

      return allPromise;
  }


  updateDiary(good1, good2, good3, privacyLevel, userId, thisDiary){
    let year =  new Date(thisDiary.date).getUTCFullYear();
    let month = new Date(thisDiary.date).getUTCMonth() + 1;
    let diaryKey = thisDiary.$key;
    let date = thisDiary.date;

    let diary = {
      date:  date,
      good1: good1,
      good2: good2,
      good3: good3,
      privacyLevel: privacyLevel
    }
     return this.db.list('diaries/' + userId + '/year/' + year + '/' + month).update(diaryKey, diary);
  }

  //used at setting.component
  updateUserName(firstName, lastName, userId){
    return this.db.object('users/' + userId).update({
      firstName: firstName,
      lastName: lastName,
    });
  }

  deleteAccount(){

    let user = firebase.auth().currentUser;

    this.getAllImageReference(user.uid).subscribe( (data) => {

      //avoid running function several times
      if(data.$value !== null) {
        this.ImageManagementService.deleteAllImage(user.uid, data)
        .then(()=> {
          return this.deleteAllDiary(user.uid);
        })
        .then( () => {
          return user.delete();
        })
        .then( () => {
          alert("Account is deleted. See you again!");
        }, (error) =>{
          console.log(error);
        });
      }
    });
  }

  getAllImageReference(userId){
    return this.db.object('diaries/' + userId + '/allImages');
  }
}
