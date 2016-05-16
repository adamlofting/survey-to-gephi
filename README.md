# survey-to-gephi

## Pre requisites

* https://nodejs.org

## setup

1. Create a folder `data` in the root.
2. Copy the survey gizmo exported data into `data` as CSV files (`msl.csv`, `hivenyc.csv`, `clubs.csv`)
3. Create a file in `data` called `disambiguation.csv`
3. Create a file in `data` called `staffnames.csv`
3. Create a file in `data` called `junknames.csv`

## running the script

```
node index
```


## disambiguation.csv

```
variation,standardized
namewithtypo,namecorrect
namenotcorrect,namecorrect
anotherwrong,anotherright
```

## staffnames.csv

```
name
adamlofting
anotherperson
etcetcetc
```

## junknames.csv

```
name
testymctestface
anotherperson
etcetcetc
```
