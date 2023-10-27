import random
#lire un fichier csv et mettre chaque ligne dans une liste
with open('ExamCiscoCSV.csv', 'r', encoding="utf-8") as f:
    data = f.readlines()
#conversion du csv en liste avec les , comme séparateur et en supprimant les " en trop
data = [x.strip().split(';') for x in data]
#conversion de la liste en dictionnaire, clé = question, valeurs = liste avec indice 0 : nombre de réponses, indice 1 : nombre de bonnes réponses, indice 2 : réponse 1, indice 3 : réponse 2, etc...
data = {x[0]:x[1:] for x in data}

#randomiser le dictionnaire
data = list(data.items())
random.shuffle(data)
data = dict(data)

nbquetionrépondu=0
nombrebonnequestion=0
for clé, valeurs in data.items():
    ajoutfichier=""
    positionBonneReponses=[]
    print(clé)
    valeurs[0]=valeurs[0].replace('"','')
    valeurs[1]=valeurs[1].replace('"','')
    #supression des valeurs '' dans la liste
    valeurs = [x for x in valeurs if x != '']

    nbreponse=int(valeurs[0])
    nbbonnereponse=int(valeurs[1])
    temp=valeurs[nbreponse+2:]
    for i in temp:
        positionBonneReponses.append(int(i))
    #liste des réponses
    print()
    for nb in range(2,2+nbreponse):
        print(f"Réponse {nb-1} : {valeurs[nb]}")
    print()
    #print("nombre de bonnes réponses : ",nbbonnereponse)
    #print("nombre de réponses : ",nbreponse)
    #print("bonnes réponses : ",positionBonneReponses)
    numéroréponse=input("Quelle est votre réponse ? ")
    if numéroréponse == "":
        numéroréponse="0"
    #mise en liste des éléments séparer par des ,
    numéroréponse=numéroréponse.split(',')
    #conversion des éléments de la liste en int
    numéroréponse=[int(x) for x in numéroréponse]
    #tri de la liste
    numéroréponse.sort()
    if numéroréponse == positionBonneReponses:
        print("Bonne réponse")
        print()
        nombrebonnequestion+=1
        nbquetionrépondu+=1
    else:
        print("Mauvaise réponse")
        #affichage des bonnes réponses
        print("Les bonnes réponses étaient : ")
        ajoutfichier+=clé+"\n"
        for i in positionBonneReponses:
            print(f"Réponse {i} : {valeurs[i+1]}")
            ajoutfichier+=f"Réponse {i} : {valeurs[i+1]}\n"
        ajoutfichier+="\n"
        #écriture dans un fichier
        with open('erreurs.txt', 'a', encoding="utf-8") as f:
            f.write(ajoutfichier)
        print()
        nbquetionrépondu+=1
    
    if nbquetionrépondu == 60:
        break

#affichage du score
print("Score : ",nombrebonnequestion,"/",nbquetionrépondu)
#calcul du pourcentage
pourcentage=nombrebonnequestion/nbquetionrépondu*100
print("Pourcentage : ",pourcentage,"%")